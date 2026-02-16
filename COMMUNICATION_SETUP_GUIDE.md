# COMMUNICATION SETUP GUIDE

## Prerequisites
- **Node.js**: Make sure to have Node.js installed on your machine. You can download it from [nodejs.org](https://nodejs.org/).
- **Database**: You will need a database set up. This guide assumes you are using PostgreSQL.

## Database Setup
1. **Install PostgreSQL**: Follow the installation guide for your operating system on the [PostgreSQL official website](https://www.postgresql.org/download/).
2. **Create Database**: Open your PostgreSQL command line or PGAdmin and run:
   ```sql
   CREATE DATABASE communication_extension;
   ```
3. **Configure User**: Make sure to create a user with permissions on the database.
   ```sql
   CREATE USER yourusername WITH PASSWORD 'yourpassword';
   GRANT ALL PRIVILEGES ON DATABASE communication_extension TO yourusername;
   ```

## Backend Configuration
1. Clone the repository:
   ```bash
   git clone https://github.com/beeree7-source/cigar-order-hub.git
   cd cigar-order-hub
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following:
   ```dotenv
   DATABASE_URL=postgres://yourusername:yourpassword@localhost:5432/communication_extension
   ```
4. Run migrations:
   ```bash
   npm run migrate
   ```

## Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the frontend server:
   ```bash
   npm start
   ```

## Testing
- Make sure to write tests for your features. Use the following command to run tests:
   ```bash
   npm test
   ```

## Usage Examples
- After running the application, visit `http://localhost:3000` in your web browser to access the Communication Extension.
- You can send requests to the API endpoints as documented in the API documentation.

## Troubleshooting
- If you encounter any issues, check the console for error messages. Common problems include:
  - Incorrect database configuration in the `.env` file.
  - Missing npm packages; try running `npm install` again.

## Production Deployment Guidance
1. **Build the application**:
   ```bash
   npm run build
   ```
2. Use a process manager like PM2 to run your backend in production:
   ```bash
   pm2 start server.js
   ```
3. Ensure your database is properly configured and securely accessible.

For further assistance, feel free to reach out to the development team.
