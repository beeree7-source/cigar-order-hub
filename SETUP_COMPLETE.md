# Setup Guide for Cigar Order Hub

## Overview
This document provides comprehensive setup instructions and configuration details for the Cigar Order Hub project.

## Prerequisites
Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version X.X.X)
- [npm](https://www.npmjs.com/) (version X.X.X)
- [MongoDB](https://www.mongodb.com/)

## Installation Steps
1. **Clone the Repository**  
   Open your terminal or command prompt and run:
   ```bash
   git clone https://github.com/beeree7-source/cigar-order-hub.git
   cd cigar-order-hub
   ```

2. **Install Dependencies**  
   Run the following command to install the required packages:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**  
   Create a `.env` file in the root directory and add the following:
   ```plaintext
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/cigar_order_hub
   ```
   Replace the `MONGO_URI` value with your MongoDB connection string.

4. **Run the Application**  
   Start the application by running:
   ```bash
   npm start
   ```
   You should see the application running at `http://localhost:3000`.

## Configuration Details
- **Database Configuration**: Make sure MongoDB is running on your machine. You can start it using:
   ```bash
   mongod
   ```
- **Port Configuration**: By default, the application runs on port 3000. You can change this in the `.env` file.

## Troubleshooting
- If you encounter issues, check the following:
  - Ensure all dependencies are installed.
  - Verify your environment variables are set correctly.
  - Check the MongoDB service status.

## Conclusion
You have successfully set up the Cigar Order Hub application! If you have any issues or questions, please reach out to the project maintainers.