const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors'); 
const app = express();
const port = 5711; // Choose your desired port
app.use(cors());
// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(express.json());
app.options('*', cors());

// PostgreSQL connection pool
const pool = new Pool({
    user: 'postgres', // Replace with your PostgreSQL username
    host: 'localhost',
    database: 'inventory_management', // Replace with your database name
    password: 'ashu', // Replace with your database password
    port: 5432, // Replace with your database port if different
});

// Connect to PostgreSQL and create tables
pool.connect(async (err, client, release) => {
    if (err) {
        console.error('Error acquiring client', err.stack);
        return;
    }

    
});
async function calculateTotalPrice(product_name, quantity) {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT price FROM stock WHERE product_name = $1', [product_name]);
        if (result.rows.length === 0) {
            throw new Error('Product not found');
        }
        const price = result.rows[0].price;
        return price * quantity;
    } finally {
        client.release();
    }
}
async function getAvailableStock(product_name) {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT quantity FROM stock
            WHERE product_name = $1;
        `, [product_name]);
        
        if (result.rows.length > 0) {
            return result.rows[0].quantity;
        } else {
            return 0; // Product not found, assume no stock
        }
    } finally {
        client.release();
    }
}

// Serve login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle login form submission
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM "User" WHERE username = $1 AND password = $2;', [username, password]);
        const user = result.rows[0];

        if (!user) {
            res.status(401).send('Invalid username or password');
        } else {
            if (user.role === 'owner') {
                res.redirect('/admin_dashboard.html');
            } else if (user.role === 'customer') {
                res.redirect('/customer_dashboard.html');
            } else {
                res.send('You do not have permission to access this page');
            }
        }

        client.release();
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('Internal server error');
    }
});

// Serve admin dashboard
app.get('/admin_dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin_dashboard.html'));
});

// Serve customer dashboard
app.get('/customer_dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'customer_dashboard.html'));
});

// Serve add stock form
app.get('/add_stock_form.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'add_stock_form.html'));
});

// Serve update price form
app.get('/update_price_form.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'update_price_form.html'));
});

// Serve delete stock form
app.get('/delete_stock_form.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'delete_stock_form.html'));
});
app.get('/view_stock_customer.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'view_stock_customer.html'));
});

// Serve place order form
app.get('/place_order.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'place_order.html'));
});



// Serve view orders page
app.get('/view_orders.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'view_orders.html'));
});


app.get('/api/suppliers', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM supplier;');
        res.json(result.rows);
        client.release();
    } catch (err) {
        console.error('Error fetching suppliers:', err);
        res.status(500).send('Internal server error');
    }
});
// Serve customer details page
app.get('/view_customers.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'view_customers.html'));
});

// Example route definition in your Node.js + Express server
app.get('/api/customers', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM customer;');
        res.json(result.rows);
        client.release();
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).send('Internal server error');
    }
});



// GET all stock items
app.get('/api/stock', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM stock;');
        res.json(result.rows);
        client.release();
    } catch (err) {
        console.error('Error fetching stock:', err);
        res.status(500).send('Internal server error');
    }
});


app.post('/api/stock', async (req, res) => {
    const { product_name, quantity, price } = req.body;

    try {
        const client = await pool.connect();
        const result = await client.query(`
            INSERT INTO stock (product_name, quantity, price, available_quantity)
            VALUES ($1, $2, $3, $2) -- Set available_quantity initially to quantity
            RETURNING *
        `, [product_name, quantity, price]);

        const addedStock = result.rows[0];
        res.status(201).json(addedStock);
        client.release();
    } catch (error) {
        console.error('Error adding stock:', error);
        res.status(500).send('Error adding stock item');
    }
});
app.put('/api/stock/:product_id', async (req, res) => {
    const { product_id } = req.params;
    const { product_name, quantity, price } = req.body;

    try {
        const client = await pool.connect();
        const result = await client.query(`
            UPDATE stock
            SET product_name = $1, quantity = $2, price = $3, available_quantity = $2
            WHERE product_id = $4
            RETURNING *;
        `, [product_name, quantity, price, product_id]);

        if (result.rows.length === 0) {
            res.status(404).send(`Stock item with ID ${product_id} not found`);
        } else {
            res.json(result.rows[0]);
        }

        client.release();
    } catch (err) {
        console.error('Error updating stock item:', err);
        res.status(500).send('Internal server error');
    }
});
app.delete('/api/stock/:product_id', async (req, res) => {
    const { product_id } = req.params;
    try {
        const client = await pool.connect();
        const result = await client.query(`
            DELETE FROM stock
            WHERE product_id = $1
            RETURNING *;
        `, [product_id]);

        if (result.rows.length === 0) {
            res.status(404).send(`Stock item with ID ${product_id} not found`);
        } else {
            res.json({ message: `Stock item with ID ${product_id} deleted successfully` });
        }

        client.release();
    } catch (err) {
        console.error('Error deleting stock item:', err);
        res.status(500).send('Internal server error');
    }
});

// POST to place order
// POST to place order
// POST to place order
app.post('/api/place_order', async (req, res) => {
    try {
        const { customer_id, product_name, quantity } = req.body;

        // Validate input data
        if (!customer_id || !product_name || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        // Calculate total price
        const totalPrice = await calculateTotalPrice(product_name, quantity);
        const availableStock = await getAvailableStock(product_name);
        if (availableStock < quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }
        

        // Insert the order into the database
        const client = await pool.connect();
        await client.query('BEGIN'); // Begin transaction
        
        try {
            // Insert order
            const orderResult = await client.query(`
                INSERT INTO orders (customer_id, product_name, quantity, total_price)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `, [customer_id, product_name, quantity, totalPrice]);

            const newOrder = orderResult.rows[0];

            // Update stock quantity
            const updateStockResult = await client.query(`
                UPDATE stock
                SET quantity = quantity - $1
                WHERE product_name = $2;
            `, [quantity, product_name]);

            if (updateStockResult.rowCount === 0) {
                throw new Error('Failed to update stock quantity');
            }

            await client.query('COMMIT'); // Commit transaction
            res.status(201).json(newOrder);
        } catch (error) {
            await client.query('ROLLBACK'); // Rollback transaction
            throw error; // Throw the error for centralized error handling
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ error: 'Failed to place order' });
    }
});



// Fetch all orders along with customer names
app.get('/api/orders', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(`
            SELECT o.order_id, o.customer_id, c.username as customer_name, o.product_name, o.quantity, o.total_price
            FROM orders o
            JOIN customer c ON o.customer_id = c.customer_id;
        `);
        res.json(result.rows);
        client.release();
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).send('Internal server error');
    }
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
