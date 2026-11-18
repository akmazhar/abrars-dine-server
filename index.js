require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// MIDDLEWARE
// ========================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// ========================================
// MONGODB CONFIGURATION
// ========================================

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI is missing in .env file");
  process.exit(1);
}

const client = new MongoClient(uri);

let dishCollection;
let sixcardCollection;
let myAddedFoodCollection;
let myOrderCollection;

// ========================================
// HELPER FUNCTIONS
// ========================================

const isValidId = (id) =>
  typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ========================================
// HOME ROUTE
// ========================================

app.get("/", (req, res) => {
  res.send("Abrar's Dine Server is Running!");
});

// ========================================
// ALL FOOD - GET
// ========================================

app.get("/allfood", async (req, res) => {
  try {
    const foods = await dishCollection.find().sort({ _id: -1 }).toArray();

    res.send(foods);
  } catch (error) {
    console.error("All food error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load food items",
    });
  }
});

// ========================================
// FOOD BY ID OR CATEGORY
// ========================================

app.get("/allfood/:param", async (req, res) => {
  try {
    const { param } = req.params;

    if (isValidId(param)) {
      const food = await dishCollection.findOne({
        _id: new ObjectId(param),
      });

      if (!food) {
        return res.status(404).send({
          success: false,
          message: "Food not found",
        });
      }

      return res.send(food);
    }

    const foods = await dishCollection
      .find({
        category: {
          $regex: escapeRegex(param),
          $options: "i",
        },
      })
      .toArray();

    res.send(foods);
  } catch (error) {
    console.error("Food search error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load food",
    });
  }
});

// ========================================
// BANGLADESHI FOOD
// ========================================

app.get("/bangladeshi", async (req, res) => {
  try {
    const foods = await dishCollection
      .find({
        origin: {
          $regex: "Bangladesh",
          $options: "i",
        },
      })
      .toArray();

    res.send(foods);
  } catch (error) {
    console.error("Bangladeshi food error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load Bangladeshi food",
    });
  }
});

// ========================================
// SIX CARD
// ========================================

app.get("/sixcard", async (req, res) => {
  try {
    const cards = await sixcardCollection.find().toArray();
    res.send(cards);
  } catch (error) {
    console.error("Six card error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load cards",
    });
  }
});

// ========================================
// ADD FOOD TO MAIN DISH COLLECTION
// ========================================

app.post("/allfood", async (req, res) => {
  try {
    const food = req.body;

    if (!food || Object.keys(food).length === 0) {
      return res.status(400).send({
        success: false,
        message: "Food information is required",
      });
    }

    const result = await dishCollection.insertOne(food);

    res.status(201).send({
      success: true,
      message: "Food added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Add food error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to add food",
    });
  }
});

// ========================================
// MY ADDED FOOD - POST
// ========================================

app.post("/myAddedFood", async (req, res) => {
  try {
    const food = req.body;

    if (!food || Object.keys(food).length === 0) {
      return res.status(400).send({
        success: false,
        message: "Food information is required",
      });
    }

    const result = await myAddedFoodCollection.insertOne(food);

    res.status(201).send({
      success: true,
      message: "Food added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("My added food POST error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to add food",
    });
  }
});

// ========================================
// MY ADDED FOOD - GET
// ========================================

app.get("/myAddedFood", async (req, res) => {
  try {
    const foods = await myAddedFoodCollection
      .find()
      .sort({ _id: -1 })
      .toArray();

    res.send(foods);
  } catch (error) {
    console.error("My added food GET error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load added foods",
    });
  }
});

// ========================================
// UPDATE MY ADDED FOOD - GET
// ========================================

app.get("/updateFood/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid food ID",
      });
    }

    const food = await myAddedFoodCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!food) {
      return res.status(404).send({
        success: false,
        message: "Food not found in My Added Food collection",
      });
    }

    res.send(food);
  } catch (error) {
    console.error("Update food GET error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load food details",
    });
  }
});

// ========================================
// UPDATE MY ADDED FOOD - PUT
// ========================================

app.put("/updateFood/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid food ID",
      });
    }

    const { _id, ...updatedFood } = req.body;

    if (Object.keys(updatedFood).length === 0) {
      return res.status(400).send({
        success: false,
        message: "Update information is required",
      });
    }

    const result = await myAddedFoodCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedFood },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Food not found",
      });
    }

    res.send({
      success: true,
      message: "Food updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Update food PUT error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to update food",
    });
  }
});

// ========================================
// FOOD PURCHASE - GET
// ========================================

app.get("/foodPurchase/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid food ID",
      });
    }

    const food = await dishCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!food) {
      return res.status(404).send({
        success: false,
        message: "Food not found",
      });
    }

    res.send(food);
  } catch (error) {
    console.error("Purchase GET error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load purchase details",
    });
  }
});

// ========================================
// FOOD PURCHASE - POST
// ========================================

app.post("/foodPurchase/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { quantity, buyingDate, buyerName, buyerEmail } = req.body;

    if (!isValidId(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid food ID",
      });
    }

    if (
      !Number.isFinite(Number(quantity)) ||
      Number(quantity) <= 0 ||
      !buyingDate ||
      !buyerName ||
      !buyerEmail
    ) {
      return res.status(400).send({
        success: false,
        message: "Please provide all required purchase information",
      });
    }

    const food = await dishCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!food) {
      return res.status(404).send({
        success: false,
        message: "Food not found",
      });
    }

    const order = {
      foodId: food._id.toString(),
      name: food.name,
      image: food.image,
      category: food.category,
      origin: food.origin,
      price: food.price,
      quantity: Number(quantity),
      buyingDate,
      buyerName: String(buyerName).trim(),
      buyerEmail: String(buyerEmail).toLowerCase().trim(),
      createdAt: new Date(),
    };

    const result = await myOrderCollection.insertOne(order);

    res.status(201).send({
      success: true,
      message: "Purchase completed successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Purchase POST error:", error);

    res.status(500).send({
      success: false,
      message: "Purchase failed",
    });
  }
});

// ========================================
// MY ORDER - GET
// ========================================

app.get("/myOrder", async (req, res) => {
  try {
    const buyerEmail = req.query.buyerEmail;

    const filter = buyerEmail
      ? {
          buyerEmail: {
            $regex: `^${escapeRegex(String(buyerEmail).trim())}$`,
            $options: "i",
          },
        }
      : {};

    const orders = await myOrderCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.send(orders);
  } catch (error) {
    console.error("My order GET error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load orders",
    });
  }
});

// ========================================
// REPAIR OLD ORDER - PATCH
// ========================================

app.patch("/myOrder/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { foodId } = req.body;

    if (!isValidId(id) || !isValidId(foodId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid order ID or food ID",
      });
    }

    const food = await dishCollection.findOne({
      _id: new ObjectId(foodId),
    });

    if (!food) {
      return res.status(404).send({
        success: false,
        message: "Original food not found",
      });
    }

    const result = await myOrderCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          foodId: food._id.toString(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    res.send({
      success: true,
      message: "Food ID saved successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Repair order error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to update order",
    });
  }
});

// ========================================
// DELETE MY ORDER
// ========================================

app.delete("/myOrder/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid order ID",
      });
    }

    const result = await myOrderCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    res.send({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("Delete order error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to delete order",
    });
  }
});

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).send({
    success: false,
    message: "Internal server error",
  });
});

// ========================================
// START SERVER
// ========================================

async function run() {
  try {
    await client.connect();

    console.log("MongoDB Connected Successfully!");

    const database = client.db("abrarsDine");

    dishCollection = database.collection("dish");
    sixcardCollection = database.collection("sixcard");
    myAddedFoodCollection = database.collection("myAddedFood");
    myOrderCollection = database.collection("myOrder");

    app.listen(PORT, () => {
      console.log(`Abrar's Dine server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
}

run();

// ========================================
// GRACEFUL SHUTDOWN
// ========================================

process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  await client.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down server...");
  await client.close();
  process.exit(0);
});
