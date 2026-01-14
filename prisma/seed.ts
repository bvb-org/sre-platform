import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

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

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        name: userData.name,
        avatarUrl: null,
      },
    });
    console.log('Created user:', user.name);
  }

  // Create mock runbooks (10 APIs across 4-5 teams)
  const runbooks = [
    {
      serviceName: 'Payment API',
      teamName: 'Payments',
      teamEmail: 'payments@example.com',
      description: 'Handles all payment processing, including credit card transactions, refunds, and payment method management. Critical service for revenue operations.',
      monitoringLinks: JSON.stringify([
        { name: 'Grafana Dashboard', url: 'https://grafana.example.com/payment-api' },
        { name: 'Datadog Logs', url: 'https://datadog.example.com/logs/payment' },
      ]),
      upstreamServices: JSON.stringify([]),
      downstreamServices: JSON.stringify(['Order Processing API', 'Billing API']),
      runbookProcedures: 'Common issues:\n1. High latency - Check database connections\n2. Failed transactions - Verify payment gateway status\n3. Timeout errors - Scale up instances',
    },
    {
      serviceName: 'User Auth API',
      teamName: 'Identity',
      teamEmail: 'identity@example.com',
      description: 'Authentication and authorization service managing user sessions, OAuth flows, and access tokens. Handles SSO integration and multi-factor authentication.',
      monitoringLinks: JSON.stringify([
        { name: 'Grafana Dashboard', url: 'https://grafana.example.com/auth-api' },
        { name: 'CloudWatch Logs', url: 'https://cloudwatch.example.com/auth' },
      ]),
      upstreamServices: JSON.stringify([]),
      downstreamServices: JSON.stringify(['User Profile API', 'Notification Service']),
      runbookProcedures: 'Common issues:\n1. Login failures - Check Redis cache\n2. Token expiration - Verify JWT configuration\n3. SSO issues - Check IdP connectivity',
    },
    {
      serviceName: 'Notification Service',
      teamName: 'Communications',
      teamEmail: 'comms@example.com',
      description: 'Multi-channel notification delivery system supporting email, SMS, push notifications, and in-app messages. Manages notification preferences and delivery tracking.',
      monitoringLinks: JSON.stringify([
        { name: 'Grafana Dashboard', url: 'https://grafana.example.com/notifications' },
        { name: 'Splunk Logs', url: 'https://splunk.example.com/notifications' },
      ]),
      upstreamServices: JSON.stringify(['User Auth API']),
      downstreamServices: JSON.stringify([]),
      runbookProcedures: 'Common issues:\n1. Email delays - Check SES queue\n2. SMS failures - Verify Twilio credits\n3. Push notification issues - Check FCM/APNS status',
    },
    {
      serviceName: 'Order Processing API',
      teamName: 'Commerce',
      teamEmail: 'commerce@example.com',
      description: 'Core order management system handling order creation, updates, cancellations, and fulfillment workflows. Integrates with inventory and payment systems.',
      monitoringLinks: JSON.stringify([
        { name: 'Grafana Dashboard', url: 'https://grafana.example.com/orders' },
        { name: 'Datadog APM', url: 'https://datadog.example.com/apm/orders' },
      ]),
      upstreamServices: JSON.stringify(['Payment API', 'Inventory API']),
      downstreamServices: JSON.stringify([]),
      runbookProcedures: 'Common issues:\n1. Order stuck - Check workflow state machine\n2. Inventory sync issues - Verify message queue\n3. Payment reconciliation - Check transaction logs',
    },
    {
      serviceName: 'Inventory API',
      teamName: 'Commerce',
      teamEmail: 'commerce@example.com',
      description: 'Real-time inventory management tracking stock levels, reservations, and warehouse operations. Provides availability data for product catalog.',
      monitoringLinks: JSON.stringify([
        { name: 'Grafana Dashboard', url: 'https://grafana.example.com/inventory' },
        { name: 'Datadog Metrics', url: 'https://datadog.example.com/metrics/inventory' },
      ]),
      upstreamServices: JSON.stringify([]),
      downstreamServices: JSON.stringify(['Order Processing API', 'Search API']),
      runbookProcedures: 'Common issues:\n1. Stock discrepancies - Run reconciliation job\n2. Reservation timeouts - Check Redis locks\n3. Sync delays - Verify Kafka consumer lag',
    },
    {
      serviceName: 'Analytics API',
      teamName: 'Data',
      teamEmail: 'data@example.com',
      description: 'Data aggregation and analytics service providing business metrics, user behavior insights, and reporting capabilities. Powers dashboards and BI tools.',
      monitoringLinks: JSON.stringify([
        { name: 'Grafana Dashboard', url: 'https://grafana.example.com/analytics' },
        { name: 'CloudWatch Logs', url: 'https://cloudwatch.example.com/analytics' },
      ]),
      upstreamServices: JSON.stringify([]),
      downstreamServices: JSON.stringify([]),
      runbookProcedures: 'Common issues:\n1. Query timeouts - Check BigQuery quotas\n2. Stale data - Verify ETL pipeline\n3. Dashboard errors - Check data warehouse connection',
    },
    {
      serviceName: 'Search API',
      teamName: 'Discovery',
      teamEmail: 'discovery@example.com',
      description: 'Elasticsearch-based search service providing product search, filtering, and recommendations. Handles search indexing and query optimization.',
      monitoringLinks: JSON.stringify([
        { name: 'Grafana Dashboard', url: 'https://grafana.example.com/search' },
        { name: 'Elasticsearch Logs', url: 'https://elastic.example.com/logs' },
      ]),
      upstreamServices: JSON.stringify(['Inventory API']),
      downstreamServices: JSON.stringify(['Recommendation Engine']),
      runbookProcedures: 'Common issues:\n1. Slow queries - Check index health\n2. Missing results - Verify indexing pipeline\n3. High CPU - Scale Elasticsearch cluster',
    },
    {
      serviceName: 'Recommendation Engine',
      teamName: 'Discovery',
      teamEmail: 'discovery@example.com',
      description: 'Machine learning-powered recommendation system providing personalized product suggestions based on user behavior and preferences.',
      monitoringLinks: JSON.stringify([
        { name: 'Grafana Dashboard', url: 'https://grafana.example.com/recommendations' },
        { name: 'MLflow Tracking', url: 'https://mlflow.example.com/recommendations' },
      ]),
      upstreamServices: JSON.stringify(['Search API', 'Analytics API']),
      downstreamServices: JSON.stringify([]),
      runbookProcedures: 'Common issues:\n1. Model serving errors - Check TensorFlow Serving\n2. Cold start latency - Warm up model cache\n3. Poor recommendations - Retrain model',
    },
    {
      serviceName: 'Email Service',
      teamName: 'Communications',
      teamEmail: 'comms@example.com',
      description: 'Dedicated email delivery service managing transactional and marketing emails. Handles template rendering, personalization, and delivery tracking.',
      monitoringLinks: JSON.stringify([
        { name: 'Grafana Dashboard', url: 'https://grafana.example.com/email' },
        { name: 'SendGrid Dashboard', url: 'https://sendgrid.example.com' },
      ]),
      upstreamServices: JSON.stringify(['Notification Service']),
      downstreamServices: JSON.stringify([]),
      runbookProcedures: 'Common issues:\n1. Bounce rate spike - Check sender reputation\n2. Template errors - Verify template syntax\n3. Delivery delays - Check email queue',
    },
    {
      serviceName: 'Billing API',
      teamName: 'Payments',
      teamEmail: 'payments@example.com',
      description: 'Subscription and billing management service handling recurring payments, invoicing, and revenue recognition. Integrates with accounting systems.',
      monitoringLinks: JSON.stringify([
        { name: 'Grafana Dashboard', url: 'https://grafana.example.com/billing' },
        { name: 'Datadog Logs', url: 'https://datadog.example.com/logs/billing' },
      ]),
      upstreamServices: JSON.stringify(['Payment API']),
      downstreamServices: JSON.stringify([]),
      runbookProcedures: 'Common issues:\n1. Invoice generation failures - Check PDF service\n2. Subscription sync issues - Verify Stripe webhooks\n3. Revenue calculation errors - Run reconciliation',
    },
  ];

  for (const runbook of runbooks) {
    const created = await prisma.runbook.upsert({
      where: { serviceName: runbook.serviceName },
      update: runbook,
      create: runbook,
    });
    console.log('Created runbook:', created.serviceName);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
