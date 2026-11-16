const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// ===============================
// Middleware
// ===============================

app.use(cors());
app.use(express.json());

// ===============================
// MongoDB Configuration
// ===============================

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

// ===============================
// Start Server
// ===============================

async function startServer() {
  try {
    // Connect MongoDB
    await client.connect();

    await client.db("admin").command({ ping: 1 });

    console.log("Successfully connected to MongoDB!");

    // Database
    const db = client.db("abrarsDine");

    // Collections
    const serviceCollection = db.collection("dish");
    const serviceData = db.collection("sixcard");
    const myAddedFoodCollection = db.collection("myAddedFood");

    // ===============================
    // Root API
    // ===============================

    app.get("/", (req, res) => {
      res.send("Abrars Dine Server is Running");
    });

    // ===============================
    // Get All Food
    // ===============================

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

    // ===============================
    // Get Food by Category or ID
    // ===============================

    app.get("/allfood/:param", async (req, res) => {
      try {
        const param = req.params.param;

        let result;

        // Check MongoDB ObjectId
        if (/^[0-9a-fA-F]{24}$/.test(param)) {
          result = await serviceCollection.findOne({
            _id: new ObjectId(param),
          });
        } else {
          // Category filtering
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

    // ===============================
    // Get Bangladeshi Food
    // ===============================

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

    // ===============================
    // Get Six Card Data
    // ===============================

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

    // ===============================
    // Add New Food
    // ===============================

    app.post("/allfood", async (req, res) => {
      try {
        const newAllFood = req.body;

        const result = await serviceCollection.insertOne(newAllFood);

        res.status(201).send(result);
      } catch (error) {
        console.error("Add Food API Error:", error);

        res.status(500).send({
          message: "Failed to add food",
        });
      }
    });

    // ===============================
    // Add User's Food
    // ===============================

    app.post("/myAddedFood", async (req, res) => {
      try {
        const myAddedFood = req.body;

        const result = await myAddedFoodCollection.insertOne(myAddedFood);

        res.status(201).send(result);
      } catch (error) {
        console.error("My Added Food API Error:", error);

        res.status(500).send({
          message: "Failed to add user's food",
        });
      }
    });

    // ===============================
    // Start Listening
    // ===============================

    app.listen(port, "0.0.0.0", () => {
      console.log(`Abrars Dine Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
