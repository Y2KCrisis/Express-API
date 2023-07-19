const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

require('dotenv').config();

const port = process.env.PORT;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

// Middleware to handle database connections and releases
app.use(async function (req, res, next) {
  try {
    req.db = await pool.getConnection();
    req.db.connection.config.namedPlaceholders = true;

    // Set session SQL mode and time zone
    await req.db.query(`SET SESSION sql_mode = "TRADITIONAL"`);
    await req.db.query(`SET time_zone = '-8:00'`);

    await next();

    req.db.release();
  } catch (err) {
    console.log(err);

    if (req.db) req.db.release();
    throw err;
  }
});

app.use(cors());
app.use(express.json());

// GET endpoint to fetch all cars
app.get('/cars', async function (req, res) {
  try {
    const [rows] = await req.db.query('SELECT * FROM car');

    res.json({ success: true, data: rows });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// PUT endpoint to update a car
app.put('/car/:id', async function (req, res) {
  try {
    const carId = req.params.id;
    const { make, model, year } = req.body;

    // Update the specified car
    const result = await req.db.query(
      'UPDATE car SET make = ?, model = ?, year = ? WHERE id = ?',
      [make, model, year, carId]
    );

    if (result[0].affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found',
      });
    }

    return res.json({ success: true, message: 'Car updated successfully' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// DELETE endpoint to delete a car
app.delete('/car/:id', async function (req, res) {
  try {
    const carId = req.params.id;

    // Update the "deleted_flag" column of the specified car
    const result = await req.db.query(
      'UPDATE car SET deleted_flag = 1 WHERE id = ?',
      [carId]
    );

    if (result[0].affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found',
      });
    }

    return res.json({ success: true, message: 'Car deleted successfully' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// POST endpoint to insert a new car
app.post('/car', async function (req, res) {
  try {
    const { make, model, year } = req.body;

    // Insert the new car into the car table
    const result = await req.db.query(
      'INSERT INTO car (make, model, year) VALUES (?, ?, ?)',
      [make, model, year]
    );

    if (result[0].affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to insert car',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Car inserted successfully',
      carId: result[0].insertId,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.listen(port, () =>
  console.log(`Express API is running on http://localhost:${port}`)
);





