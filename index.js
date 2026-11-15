const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Environment Variables
if (!process.env.DB_USER || !process.env.DB_PASS) {
  throw new Error("MongoDB credentials are missing!");
}

// MongoDB Connection
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

async function startServer() {
  try {
    // Connect MongoDB
    await client.connect();

    await client.db("admin").command({ ping: 1 });

    console.log("Successfully connected to MongoDB!");

    const db = client.db("abrarsDine");

    const serviceCollection = db.collection("allfood");
    const serviceData = db.collection("sixcard");
    const bdData = db.collection("bangladeshi");
    const myAddedFoodCollection = db.collection("myAddedFood");

    // Root API
    app.get("/", (req, res) => {
      res.send("Abrars Dine Server is Running");
    });

    // Get all food
    app.get("/allfood", async (req, res) => {
      try {
        const result = await serviceCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Server error" });
      }
    });

    // Get food by category OR ID
    app.get("/allfood/:param", async (req, res) => {
      try {
        const param = req.params.param;

        let result;

        if (/^[0-9a-fA-F]{24}$/.test(param)) {
          result = await serviceCollection.findOne({
            _id: new ObjectId(param),
          });
        } else {
          result = await serviceCollection.find({ category: param }).toArray();
        }

        if (!result || (Array.isArray(result) && result.length === 0)) {
          return res.status(404).send({
            message: "Food not found",
          });
        }

        res.send(result);
      } catch (error) {
        console.error("Food API Error:", error);
        res.status(500).send({
          message: "Failed to fetch food",
        });
      }
    });

    // Get six card data
    app.get("/sixcard", async (req, res) => {
      try {
        const result = await serviceData.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Server error" });
      }
    });

    // Get Bangladeshi food
    app.get("/bangladeshi", async (req, res) => {
      try {
        const result = await bdData.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Server error" });
      }
    });

    // Add new food
    app.post("/allfood", async (req, res) => {
      try {
        const newAllFood = req.body;
        const result = await serviceCollection.insertOne(newAllFood);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to add food" });
      }
    });

    // Add user's food
    app.post("/myAddedFood", async (req, res) => {
      try {
        const myAddedFood = req.body;
        const result = await myAddedFoodCollection.insertOne(myAddedFood);
        res.send(result);
      } catch (error) {
        res.status(500).send({
          message: "Failed to add user's food",
        });
      }
    });

    // Start server after database connection
    app.listen(port, "0.0.0.0", () => {
      console.log(`Abrars Dine Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
