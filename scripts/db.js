const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI;


//connects to database and grabs client and database instance
async function connectDB() {
    if(mongoose.connection.readyState === 0) {
        await mongoose.connect(uri, {
            dbName: process.env.DB_NAME,
        });  
    }

    return {
        db: mongoose.connection.db,
        client: mongoose.connection.getClient(),
    };
    
}

module.exports = { connectDB, mongoose };