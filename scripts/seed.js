const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sre_platform',
});

async function main() {
  console.log('Starting seed...');

  try {
    // Create mock users
    const users = [
      { email: 'manager@example.com', name: 'Manager on Duty' },
      { email: 'alice.johnson@company.com', name: 'Alice Johnson' },
      { email: 'bob.smith@company.com', name: 'Bob Smith' },
      { email: 'carol.williams@company.com', name: 'Carol Williams' },
      { email: 'david.brown@company.com', name: 'David Brown' },
      { email: 'emma.davis@company.com', name: 'Emma Davis' },
      { email: 'frank.miller@company.com', name: 'Frank Miller' },
      { email: 'grace.wilson@company.com', name: 'Grace Wilson' },
      { email: 'henry.moore@company.com', name: 'Henry Moore' },
      { email: 'iris.taylor@company.com', name: 'Iris Taylor' },
      { email: 'jack.anderson@company.com', name: 'Jack Anderson' },
    ];

    for (const user of users) {
      const userResult = await pool.query(
        `INSERT INTO users (email, name)
         VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE SET name = $2
         RETURNING *`,
        [user.email, user.name]
      );
      console.log('Created user:', userResult.rows[0].name);
    }

    // Create mock runbooks
    const runbooks = [
      {
        serviceName: 'Payment API',
        teamName: 'Payments',
        teamEmail: 'payments@example.com',
        description: 'Handles all payment processing, including credit card transactions, refunds, and payment method management. Critical service for revenue operations.',
      },
      {
        serviceName: 'User Auth API',
        teamName: 'Identity',
        teamEmail: 'identity@example.com',
        description: 'Authentication and authorization service managing user sessions, OAuth flows, and access tokens. Handles SSO integration and multi-factor authentication.',
      },
      {
        serviceName: 'Notification Service',
        teamName: 'Communications',
        teamEmail: 'comms@example.com',
        description: 'Multi-channel notification delivery system supporting email, SMS, push notifications, and in-app messages.',
      },
      {
        serviceName: 'Order Processing API',
        teamName: 'Commerce',
        teamEmail: 'commerce@example.com',
        description: 'Core order management system handling order creation, updates, cancellations, and fulfillment workflows.',
      },
      {
        serviceName: 'Inventory API',
        teamName: 'Commerce',
        teamEmail: 'commerce@example.com',
        description: 'Real-time inventory management tracking stock levels, reservations, and warehouse operations.',
      },
      {
        serviceName: 'Analytics API',
        teamName: 'Data',
        teamEmail: 'data@example.com',
        description: 'Data aggregation and analytics service providing business metrics, user behavior insights, and reporting capabilities.',
      },
      {
        serviceName: 'Search API',
        teamName: 'Discovery',
        teamEmail: 'discovery@example.com',
        description: 'Elasticsearch-based search service providing product search, filtering, and recommendations.',
      },
      {
        serviceName: 'Recommendation Engine',
        teamName: 'Discovery',
        teamEmail: 'discovery@example.com',
        description: 'Machine learning-powered recommendation system providing personalized product suggestions.',
      },
      {
        serviceName: 'Email Service',
        teamName: 'Communications',
        teamEmail: 'comms@example.com',
        description: 'Dedicated email delivery service managing transactional and marketing emails.',
      },
      {
        serviceName: 'Billing API',
        teamName: 'Payments',
        teamEmail: 'payments@example.com',
        description: 'Subscription and billing management service handling recurring payments, invoicing, and revenue recognition.',
      },
    ];

    for (const runbook of runbooks) {
      const result = await pool.query(
        `INSERT INTO runbooks (service_name, team_name, team_email, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (service_name) DO UPDATE 
         SET team_name = $2, team_email = $3, description = $4
         RETURNING *`,
        [runbook.serviceName, runbook.teamName, runbook.teamEmail, runbook.description]
      );
      console.log('Created runbook:', result.rows[0].service_name);
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
