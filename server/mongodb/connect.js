const mongoose = require('mongoose');

const connectDB = (url) => {
    mongoose.set('strictQuery', true);
    mongoose.connect(url)
        .then(() => console.log(`MongoDB connected: ${url}`))
        .catch((err) => console.log(`Connect Error: ${err}`));
}

module.exports = connectDB;