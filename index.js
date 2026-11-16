const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// ======================================
// Middleware
// ======================================

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      // আপনার deployed frontend domain এখানে যোগ করুন
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// ======================================
// MongoDB Configuration
// ======================================

if (!process.env.DB_USER || !process.env.DB_PASS) {
  throw new Error("MongoDB credentials are missing!");
}

const uri = `mongodb+srv://${encodeURIComponent(
  process.env.DB_USER,
)}:${encodeURIComponent(
  process.env.DB_PASS,
)}@cluster0.zgqw3gj.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ======================================
// Start Server
// ======================================

async function startServer() {
  try {
    await client.connect();

    await client.db("admin").command({ ping: 1 });

    console.log("Successfully connected to MongoDB!");

    const db = client.db("abrarsDine");

    // Collections
    const serviceCollection = db.collection("dish");
    const serviceData = db.collection("sixcard");
    const myAddedFoodCollection = db.collection("myAddedFood");
    const myOrderCollection = db.collection("myOrder");

    // ======================================
    // Root API
    // ======================================

    app.get("/", (req, res) => {
      res.send("Abrars Dine Server is Running");
    });

    // ======================================
    // Get All Food
    // ======================================

    app.get("/allfood", async (req, res) => {
      try {
        const result = await serviceCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("All Food API Error:", error);

        res.status(500).send({
          message: "Failed to fetch food data",
        });
      }
    });

    // ======================================
    // Get Food by Category or ID
    // ======================================

    app.get("/allfood/:param", async (req, res) => {
      try {
        const { param } = req.params;

        let result;

        if (ObjectId.isValid(param)) {
          result = await serviceCollection.findOne({
            _id: new ObjectId(param),
          });
        } else {
          result = await serviceCollection
            .find({
              category: {
                $regex: `^${param}$`,
                $options: "i",
              },
            })
            .toArray();
        }

        if (!result || (Array.isArray(result) && result.length === 0)) {
          return res.status(404).send({
            message: "Food not found",
          });
        }

        res.send(result);
      } catch (error) {
        console.error("Food Details API Error:", error);

        res.status(500).send({
          message: "Failed to fetch food",
        });
      }
    });

    // ======================================
    // Get Bangladeshi Food
    // ======================================

    app.get("/bangladeshi", async (req, res) => {
      try {
        const result = await serviceCollection
          .find({
            category: {
              $regex: "^Bangladeshi$",
              $options: "i",
            },
          })
          .toArray();

        res.send(result);
      } catch (error) {
        console.error("Bangladeshi Food API Error:", error);

        res.status(500).send({
          message: "Failed to fetch Bangladeshi food",
        });
      }
    });

    // ======================================
    // Get Six Card Data
    // ======================================

    app.get("/sixcard", async (req, res) => {
      try {
        const result = await serviceData.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Six Card API Error:", error);

        res.status(500).send({
          message: "Failed to fetch six card data",
        });
      }
    });

    // ======================================
    // Add New Food
    // ======================================

    app.post("/allfood", async (req, res) => {
      try {
        const newAllFood = req.body;

        const result = await serviceCollection.insertOne(newAllFood);

        res.status(201).send({
          success: true,
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Add Food API Error:", error);

        res.status(500).send({
          message: "Failed to add food",
        });
      }
    });

    // ======================================
    // Add User's Food
    // ======================================

    app.post("/myAddedFood", async (req, res) => {
      try {
        const myAddedFood = req.body;

        const result = await myAddedFoodCollection.insertOne(myAddedFood);

        res.status(201).send({
          success: true,
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("My Added Food API Error:", error);

        res.status(500).send({
          message: "Failed to add user's food",
        });
      }
    });

    // ======================================
    // Get Food for Purchase
    // ======================================

    app.get("/foodPurchase/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            message: "Invalid food ID",
          });
        }

        const food = await serviceCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!food) {
          return res.status(404).send({
            message: "Food not found",
          });
        }

        res.send(food);
      } catch (error) {
        console.error("Get Purchase Food Error:", error);

        res.status(500).send({
          message: "Failed to load food details",
        });
      }
    });

    // ======================================
    // Create Food Purchase
    // ======================================

    app.post("/foodPurchase/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const { quantity, buyingDate, buyerName, buyerEmail } = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            message: "Invalid food ID",
          });
        }

        if (
          !quantity ||
          !Number.isFinite(Number(quantity)) ||
          Number(quantity) < 1 ||
          !buyingDate ||
          !buyerName ||
          !buyerEmail
        ) {
          return res.status(400).send({
            message: "Please provide all required purchase information",
          });
        }

        const food = await serviceCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!food) {
          return res.status(404).send({
            message: "Food not found",
          });
        }

        const order = {
          foodId: id,
          name: food.name,
          image: food.image,
          category: food.category,
          origin: food.origin,
          price: food.price,
          quantity: Number(quantity),
          buyingDate,
          buyerName,
          buyerEmail,
          createdAt: new Date(),
        };

        const result = await myOrderCollection.insertOne(order);

        res.status(201).send({
          success: true,
          message: "Purchase completed successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Food Purchase API Error:", error);

        res.status(500).send({
          message: "Failed to complete purchase",
        });
      }
    });

    // ======================================
    // Get My Orders
    // ======================================

    app.get("/myOrder", async (req, res) => {
      try {
        const result = await myOrderCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        console.error("Get My Orders API Error:", error);

        res.status(500).send({
          message: "Failed to fetch orders",
        });
      }
    });

    // ======================================
    // Delete My Order
    // ======================================

    app.delete("/myOrder/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            message: "Invalid order ID",
          });
        }

        const result = await myOrderCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({
            message: "Order not found",
          });
        }

        res.send({
          success: true,
          message: "Order deleted successfully",
          deletedCount: result.deletedCount,
        });
      } catch (error) {
        console.error("Delete Order API Error:", error);

        res.status(500).send({
          message: "Failed to delete order",
        });
      }
    });

    // ======================================
    // Start Listening
    // ======================================

    app.listen(port, "0.0.0.0", () => {
      console.log(`Abrars Dine Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
