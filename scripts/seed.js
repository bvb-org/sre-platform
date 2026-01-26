const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://sre_user:sre_password@postgres:5432/sre_platform',
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

    const userIds = {};
    for (const user of users) {
      const userResult = await pool.query(
        `INSERT INTO users (email, name)
         VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE SET name = $2
         RETURNING *`,
        [user.email, user.name]
      );
      console.log('Created user:', userResult.rows[0].name);
      userIds[user.email] = userResult.rows[0].id;
    }

    // Create mock runbooks with detailed information
    const runbooks = [
      {
        serviceName: 'Payment API',
        teamName: 'Payments',
        teamEmail: 'payments@example.com',
        description: 'Handles all payment processing, including credit card transactions, refunds, and payment method management. Critical service for revenue operations.',
        monitoringLinks: [
          { name: 'Grafana Dashboard', url: 'https://grafana.example.com/d/payment-api' },
          { name: 'Datadog APM', url: 'https://app.datadoghq.com/apm/service/payment-api' },
          { name: 'PagerDuty', url: 'https://example.pagerduty.com/services/payment-api' },
        ],
        upstreamServices: ['User Auth API', 'Billing API'],
        downstreamServices: ['Order Processing API', 'Notification Service'],
        runbookProcedures: `## Common Issues

### High Error Rate
1. Check Datadog APM for error traces
2. Verify payment gateway connectivity
3. Check database connection pool status
4. Review recent deployments

### Slow Response Times
1. Check database query performance
2. Verify payment gateway response times
3. Review connection pool metrics
4. Check for memory leaks

## Deployment

### Standard Deployment
1. Deploy to canary (10% traffic)
2. Monitor for 15 minutes
3. Increase to 50% if metrics are healthy
4. Full rollout after 30 minutes

### Rollback Procedure
1. Revert to previous version via CI/CD
2. Clear application cache
3. Restart connection pools
4. Verify payment processing

## Health Checks
- Endpoint: /health
- Expected: 200 OK with {"status": "healthy"}
- Timeout: 5 seconds`,
      },
      {
        serviceName: 'User Auth API',
        teamName: 'Identity',
        teamEmail: 'identity@example.com',
        description: 'Authentication and authorization service managing user sessions, OAuth flows, and access tokens. Handles SSO integration and multi-factor authentication.',
        monitoringLinks: [
          { name: 'Grafana Dashboard', url: 'https://grafana.example.com/d/auth-api' },
          { name: 'Auth0 Dashboard', url: 'https://manage.auth0.com' },
          { name: 'CloudWatch Logs', url: 'https://console.aws.amazon.com/cloudwatch/logs/auth-api' },
        ],
        upstreamServices: [],
        downstreamServices: ['Payment API', 'Order Processing API', 'Analytics API'],
        runbookProcedures: `## Common Issues

### Login Failures
1. Check Auth0 service status
2. Verify OAuth configuration
3. Check session store (Redis) connectivity
4. Review rate limiting rules

### Token Expiration Issues
1. Verify JWT signing key rotation
2. Check token TTL configuration
3. Review refresh token logic
4. Validate clock synchronization

## Deployment
Standard blue-green deployment with zero downtime.

## Health Checks
- Endpoint: /health
- Expected: 200 OK`,
      },
      {
        serviceName: 'Notification Service',
        teamName: 'Communications',
        teamEmail: 'comms@example.com',
        description: 'Multi-channel notification delivery system supporting email, SMS, push notifications, and in-app messages.',
        monitoringLinks: [
          { name: 'Grafana Dashboard', url: 'https://grafana.example.com/d/notification-service' },
          { name: 'Twilio Console', url: 'https://console.twilio.com' },
          { name: 'SendGrid Dashboard', url: 'https://app.sendgrid.com' },
        ],
        upstreamServices: ['Email Service'],
        downstreamServices: [],
        runbookProcedures: `## Common Issues

### Message Queue Backlog
1. Check Kafka consumer lag
2. Scale up consumer instances
3. Verify third-party API status (Twilio, SendGrid)
4. Review rate limits

### Failed Deliveries
1. Check provider API status
2. Verify API credentials
3. Review bounce/complaint rates
4. Check message formatting

## Deployment
Rolling deployment with gradual traffic shift.`,
      },
      {
        serviceName: 'Order Processing API',
        teamName: 'Commerce',
        teamEmail: 'commerce@example.com',
        description: 'Core order management system handling order creation, updates, cancellations, and fulfillment workflows.',
        monitoringLinks: [
          { name: 'Grafana Dashboard', url: 'https://grafana.example.com/d/order-api' },
          { name: 'Splunk Logs', url: 'https://splunk.example.com/app/search/order-api' },
        ],
        upstreamServices: ['Payment API', 'Inventory API', 'User Auth API'],
        downstreamServices: ['Notification Service', 'Analytics API'],
        runbookProcedures: `## Common Issues

### Order Creation Failures
1. Verify Payment API connectivity
2. Check Inventory API stock levels
3. Review database transaction logs
4. Validate order schema

### Fulfillment Delays
1. Check warehouse API integration
2. Verify shipping provider status
3. Review order queue depth
4. Check for stuck orders

## Deployment
Canary deployment with automated rollback.`,
      },
      {
        serviceName: 'Inventory API',
        teamName: 'Commerce',
        teamEmail: 'commerce@example.com',
        description: 'Real-time inventory management tracking stock levels, reservations, and warehouse operations.',
        monitoringLinks: [
          { name: 'Grafana Dashboard', url: 'https://grafana.example.com/d/inventory-api' },
          { name: 'New Relic APM', url: 'https://one.newrelic.com/inventory-api' },
        ],
        upstreamServices: [],
        downstreamServices: ['Order Processing API', 'Search API'],
        runbookProcedures: `## Common Issues

### Stock Level Discrepancies
1. Run inventory reconciliation job
2. Check warehouse sync status
3. Review reservation timeouts
4. Validate database consistency

### High Latency
1. Check database query performance
2. Review cache hit rates
3. Verify Redis connectivity
4. Check for lock contention

## Deployment
Blue-green deployment with inventory freeze window.`,
      },
      {
        serviceName: 'Analytics API',
        teamName: 'Data',
        teamEmail: 'data@example.com',
        description: 'Data aggregation and analytics service providing business metrics, user behavior insights, and reporting capabilities.',
        monitoringLinks: [
          { name: 'Grafana Dashboard', url: 'https://grafana.example.com/d/analytics-api' },
          { name: 'Redshift Console', url: 'https://console.aws.amazon.com/redshift' },
        ],
        upstreamServices: ['Order Processing API', 'User Auth API'],
        downstreamServices: [],
        runbookProcedures: `## Common Issues

### Query Timeouts
1. Check Redshift cluster status
2. Review query execution plans
3. Verify data warehouse load
4. Check for long-running queries

### Data Freshness Issues
1. Verify ETL pipeline status
2. Check data ingestion lag
3. Review Kafka consumer offsets
4. Validate data transformations

## Deployment
Standard deployment with read-only mode during updates.`,
      },
      {
        serviceName: 'Search API',
        teamName: 'Discovery',
        teamEmail: 'discovery@example.com',
        description: 'Elasticsearch-based search service providing product search, filtering, and recommendations.',
        monitoringLinks: [
          { name: 'Grafana Dashboard', url: 'https://grafana.example.com/d/search-api' },
          { name: 'Elasticsearch Kibana', url: 'https://kibana.example.com' },
        ],
        upstreamServices: ['Inventory API'],
        downstreamServices: ['Recommendation Engine'],
        runbookProcedures: `## Common Issues

### Search Results Empty
1. Check Elasticsearch cluster health
2. Verify index status
3. Review indexing pipeline
4. Check for mapping issues

### Slow Search Performance
1. Review query complexity
2. Check cluster resource usage
3. Verify shard allocation
4. Review cache configuration

## Deployment
Rolling deployment with index warm-up.`,
      },
      {
        serviceName: 'Recommendation Engine',
        teamName: 'Discovery',
        teamEmail: 'discovery@example.com',
        description: 'Machine learning-powered recommendation system providing personalized product suggestions.',
        monitoringLinks: [
          { name: 'Grafana Dashboard', url: 'https://grafana.example.com/d/recommendation-engine' },
          { name: 'SageMaker Console', url: 'https://console.aws.amazon.com/sagemaker' },
        ],
        upstreamServices: ['Search API', 'Analytics API'],
        downstreamServices: [],
        runbookProcedures: `## Common Issues

### Poor Recommendation Quality
1. Check model version deployed
2. Verify feature data freshness
3. Review A/B test results
4. Validate user behavior data

### High Latency
1. Check model inference time
2. Verify cache hit rates
3. Review batch prediction status
4. Check for cold start issues

## Deployment
Canary deployment with A/B testing framework.`,
      },
      {
        serviceName: 'Email Service',
        teamName: 'Communications',
        teamEmail: 'comms@example.com',
        description: 'Dedicated email delivery service managing transactional and marketing emails.',
        monitoringLinks: [
          { name: 'Grafana Dashboard', url: 'https://grafana.example.com/d/email-service' },
          { name: 'SendGrid Dashboard', url: 'https://app.sendgrid.com' },
          { name: 'Postmark Dashboard', url: 'https://account.postmarkapp.com' },
        ],
        upstreamServices: [],
        downstreamServices: ['Notification Service'],
        runbookProcedures: `## Common Issues

### Email Delivery Failures
1. Check SendGrid/Postmark status
2. Verify API credentials
3. Review bounce rates
4. Check spam complaints

### Template Rendering Issues
1. Verify template syntax
2. Check variable substitution
3. Review template cache
4. Validate HTML/CSS

## Deployment
Standard deployment with email queue monitoring.`,
      },
      {
        serviceName: 'Billing API',
        teamName: 'Payments',
        teamEmail: 'payments@example.com',
        description: 'Subscription and billing management service handling recurring payments, invoicing, and revenue recognition.',
        monitoringLinks: [
          { name: 'Grafana Dashboard', url: 'https://grafana.example.com/d/billing-api' },
          { name: 'Stripe Dashboard', url: 'https://dashboard.stripe.com' },
        ],
        upstreamServices: ['Payment API'],
        downstreamServices: ['Notification Service', 'Analytics API'],
        runbookProcedures: `## Common Issues

### Subscription Renewal Failures
1. Check Stripe webhook status
2. Verify payment method validity
3. Review retry logic
4. Check for expired cards

### Invoice Generation Issues
1. Verify billing cycle configuration
2. Check tax calculation service
3. Review invoice template
4. Validate pricing data

## Deployment
Blue-green deployment with billing cycle awareness.`,
      },
    ];

    const runbookIds = {};
    for (const runbook of runbooks) {
      const result = await pool.query(
        `INSERT INTO runbooks (
          service_name, team_name, team_email, description,
          monitoring_links, upstream_services, downstream_services, runbook_procedures
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (service_name) DO UPDATE
        SET team_name = $2, team_email = $3, description = $4,
            monitoring_links = $5, upstream_services = $6,
            downstream_services = $7, runbook_procedures = $8
        RETURNING *`,
        [
          runbook.serviceName,
          runbook.teamName,
          runbook.teamEmail,
          runbook.description,
          JSON.stringify(runbook.monitoringLinks),
          JSON.stringify(runbook.upstreamServices),
          JSON.stringify(runbook.downstreamServices),
          runbook.runbookProcedures,
        ]
      );
      console.log('Created runbook:', result.rows[0].service_name);
      runbookIds[runbook.serviceName] = result.rows[0].id;
    }

    // ============================================================================
    // INCIDENT 1: Database Disaster Recovery Test Gone Wrong
    // ============================================================================
    console.log('Creating Incident 1: Database DR Test Gone Wrong...');
    
    const incident1Result = await pool.query(
      `INSERT INTO incidents (
        incident_number, title, description, severity, status,
        incident_lead_id, reporter_id, created_at, detected_at,
        mitigated_at, resolved_at, closed_at, problem_statement, impact, causes, steps_to_resolve
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (incident_number) DO UPDATE SET
        title = $2, description = $3, severity = $4, status = $5
      RETURNING *`,
      [
        'INC-2024-001',
        'Production Database Outage - DR Test Executed on Wrong Environment',
        'Critical production database outage caused by disaster recovery test script accidentally executed against production environment instead of staging. All write operations failed for 2 hours and 15 minutes affecting payment processing, order creation, and user authentication.',
        'critical',
        'resolved',
        userIds['alice.johnson@company.com'],
        userIds['bob.smith@company.com'],
        '2024-11-15T14:23:00Z',
        '2024-11-15T14:23:00Z',
        '2024-11-15T16:15:00Z',
        '2024-11-15T16:38:00Z',
        '2024-11-15T18:00:00Z',
        `At 14:23 UTC on November 15, 2024, our production PostgreSQL database cluster experienced a complete outage when a disaster recovery (DR) test script was inadvertently executed against the production environment instead of the staging environment.

The DR test script performed the following actions:
1. Initiated a controlled failover to the standby replica
2. Promoted the standby to primary
3. Reconfigured connection strings to point to the new primary
4. Attempted to demote the old primary to standby

However, the script contained a critical flaw: it did not properly validate the target environment before execution. When run against production, it caused:
- The production primary database to be demoted while still serving live traffic
- Connection pool exhaustion as applications attempted to reconnect
- Replication lag of 45 seconds on the newly promoted primary
- Loss of in-flight transactions during the failover window
- Cascading failures across all services dependent on the database

The incident was detected when monitoring alerts fired for:
- Database connection failures (>95% error rate)
- Payment API 500 errors spiking to 100%
- Order Processing API unable to create new orders
- User authentication failures preventing logins`,
        `**Customer Impact:**
- 2 hours 15 minutes of complete service degradation
- 100% of payment transactions failed (estimated 3,247 failed transactions)
- 100% of new order creation failed (estimated 1,892 lost orders)
- 87% of user login attempts failed
- Customer support ticket volume increased by 340%
- Estimated revenue loss: $487,000

**Business Impact:**
- Payment processing completely unavailable
- Order fulfillment pipeline stalled
- Customer trust significantly impacted
- Negative social media sentiment spike
- Emergency communications sent to all customers
- Executive escalation to C-level

**Technical Impact:**
- All write operations to production database failed
- Read operations degraded due to replication lag
- Connection pool exhaustion across 47 application instances
- Database replication broken requiring manual intervention
- Monitoring system overwhelmed with alerts (2,847 alerts fired)
- On-call engineers paged across 4 teams

**Affected Services:**
- Payment API (100% failure rate)
- Order Processing API (100% failure rate)
- Billing API (100% failure rate)
- User Auth API (87% failure rate)
- Inventory API (read-only mode)
- Notification Service (delayed by 2+ hours)`,
        `**Root Cause:**
The disaster recovery test script lacked proper environment validation and safeguards. The script relied solely on an environment variable (DB_ENVIRONMENT) to determine the target database, but this variable was not set in the execution context, causing it to default to the production connection string.

**Contributing Factors:**
1. **Insufficient Safeguards:** No confirmation prompt or dry-run mode in the DR script
2. **Missing Environment Validation:** Script did not verify it was running against non-production
3. **Inadequate Access Controls:** Production database credentials were accessible from staging environment
4. **Human Error:** Engineer executed script from wrong terminal window
5. **Lack of Testing:** DR script had never been tested in a safe environment
6. **Documentation Gap:** Runbook did not emphasize environment verification steps
7. **No Circuit Breaker:** Database failover process had no rollback mechanism
8. **Monitoring Blind Spot:** No alerts for unexpected database topology changes

**Timeline of Failure:**
- 14:23:00 - Script execution began against production
- 14:23:15 - Primary database demoted, connection failures started
- 14:23:30 - Standby promoted to primary with 45s replication lag
- 14:24:00 - Application connection pools exhausted
- 14:25:00 - Cascading failures across all services
- 14:26:00 - Incident declared, war room established`,
        `**Immediate Mitigation (14:23 - 16:15):**
1. Incident declared at 14:26 UTC, war room established
2. Identified root cause: DR script executed on production (14:35)
3. Stopped the DR script execution immediately
4. Assessed database cluster state and replication status
5. Identified the original primary was still healthy but demoted
6. Made decision to fail back to original primary to restore service
7. Manually promoted original primary back to primary role (15:45)
8. Restarted application connection pools across all services (15:50)
9. Verified replication was functioning correctly (16:00)
10. Monitored error rates returning to normal (16:15)
11. Service fully restored and incident mitigated

**Full Resolution (16:15 - 16:38):**
1. Verified all database connections stable
2. Confirmed replication lag returned to <1 second
3. Validated data consistency across primary and replicas
4. Ran data integrity checks on critical tables
5. Verified no data corruption occurred
6. Confirmed all services operating normally
7. Reviewed and processed queued transactions
8. Incident marked as resolved at 16:38 UTC

**Post-Incident Actions (16:38 - 18:00):**
1. Customer communication sent explaining the outage
2. Detailed incident timeline documented
3. Affected customer orders manually processed
4. Failed payment transactions identified for retry
5. Post-mortem scheduled for next business day
6. Incident closed at 18:00 UTC after final verification`
      ]
    );
    
    const incident1Id = incident1Result.rows[0].id;
    console.log('Created Incident 1:', incident1Result.rows[0].incident_number);

    // Timeline events for Incident 1
    const incident1Timeline = [
      { type: 'detected', desc: 'Database connection failures detected. Payment API returning 500 errors at 95%+ rate.', user: 'bob.smith@company.com', time: '2024-11-15T14:23:00Z' },
      { type: 'investigation', desc: 'War room established. Investigating database cluster status. Identified unexpected failover in progress.', user: 'alice.johnson@company.com', time: '2024-11-15T14:26:00Z' },
      { type: 'investigation', desc: 'Root cause identified: DR test script was accidentally executed against production database instead of staging.', user: 'alice.johnson@company.com', time: '2024-11-15T14:35:00Z' },
      { type: 'action', desc: 'Stopped DR script execution. Assessing database cluster state to determine safest recovery path.', user: 'carol.williams@company.com', time: '2024-11-15T14:40:00Z' },
      { type: 'action', desc: 'Decision made to fail back to original primary. Original primary confirmed healthy with no data loss.', user: 'alice.johnson@company.com', time: '2024-11-15T15:30:00Z' },
      { type: 'action', desc: 'Manually promoting original primary back to primary role. Reconfiguring replication.', user: 'carol.williams@company.com', time: '2024-11-15T15:45:00Z' },
      { type: 'action', desc: 'Restarting application connection pools across all services. Monitoring error rates.', user: 'david.brown@company.com', time: '2024-11-15T15:50:00Z' },
      { type: 'mitigated', desc: 'Service restored. Database connections stable. Error rates returning to normal. Replication lag <1s.', user: 'alice.johnson@company.com', time: '2024-11-15T16:15:00Z' },
      { type: 'resolved', desc: 'All systems verified operational. Data integrity checks passed. No data corruption detected. Incident resolved.', user: 'alice.johnson@company.com', time: '2024-11-15T16:38:00Z' },
      { type: 'communication', desc: 'Customer communication sent explaining the outage and apologizing for the disruption.', user: 'emma.davis@company.com', time: '2024-11-15T17:00:00Z' },
    ];

    for (const event of incident1Timeline) {
      await pool.query(
        `INSERT INTO timeline_events (incident_id, event_type, description, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [incident1Id, event.type, event.desc, userIds[event.user], event.time]
      );
    }

    // Action items for Incident 1
    const incident1Actions = [
      { desc: 'Add environment validation checks to all DR scripts with mandatory confirmation prompts', user: 'carol.williams@company.com', completed: true },
      { desc: 'Implement production database access restrictions - remove prod credentials from staging', user: 'david.brown@company.com', completed: true },
      { desc: 'Create automated DR testing framework that only works in non-production environments', user: 'carol.williams@company.com', completed: false },
      { desc: 'Add database topology change alerts to monitoring system', user: 'frank.miller@company.com', completed: true },
      { desc: 'Implement circuit breaker for database failover with automatic rollback capability', user: 'carol.williams@company.com', completed: false },
      { desc: 'Update all runbooks to include explicit environment verification steps', user: 'alice.johnson@company.com', completed: true },
      { desc: 'Conduct DR drill in staging environment and document lessons learned', user: 'alice.johnson@company.com', completed: true },
      { desc: 'Process failed payment transactions and reach out to affected customers', user: 'emma.davis@company.com', completed: true },
    ];

    for (const action of incident1Actions) {
      await pool.query(
        `INSERT INTO action_items (incident_id, description, assigned_to_id, completed)
         VALUES ($1, $2, $3, $4)`,
        [incident1Id, action.desc, userIds[action.user], action.completed]
      );
    }

    // Link services to Incident 1
    const incident1Services = ['Payment API', 'Order Processing API', 'Billing API', 'User Auth API'];
    for (const serviceName of incident1Services) {
      await pool.query(
        `INSERT INTO incident_services (incident_id, runbook_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [incident1Id, runbookIds[serviceName]]
      );
    }

    console.log('Created Incident 1 with timeline and action items');

    // ============================================================================
    // INCIDENT 2: Network Connectivity Issues
    // ============================================================================
    console.log('Creating Incident 2: Network Connectivity Issues...');
    
    const incident2Result = await pool.query(
      `INSERT INTO incidents (
        incident_number, title, description, severity, status,
        incident_lead_id, reporter_id, created_at, detected_at,
        mitigated_at, resolved_at, closed_at, problem_statement, impact, causes, steps_to_resolve
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (incident_number) DO UPDATE SET
        title = $2, description = $3, severity = $4, status = $5
      RETURNING *`,
      [
        'INC-2024-002',
        'Multi-Region Network Outage - BGP Route Leak from ISP',
        'Severe network connectivity issues affecting multiple AWS regions due to BGP route leak from upstream ISP. Services experienced intermittent connectivity, high latency (5000ms+), and packet loss (40-60%). Incident lasted 3 hours and 42 minutes with cascading failures across microservices architecture.',
        'critical',
        'resolved',
        userIds['david.brown@company.com'],
        userIds['frank.miller@company.com'],
        '2024-12-03T09:15:00Z',
        '2024-12-03T09:15:00Z',
        '2024-12-03T11:45:00Z',
        '2024-12-03T12:57:00Z',
        '2024-12-03T14:00:00Z',
        `At 09:15 UTC on December 3, 2024, our infrastructure experienced severe network connectivity issues affecting services across multiple AWS regions (us-east-1, eu-west-1, and ap-southeast-1). The root cause was traced to a BGP route leak from our upstream ISP (Tier-1 provider) that caused massive routing instability.

**What Happened:**
Our monitoring systems detected a sudden spike in network latency and packet loss across all regions simultaneously. Initial symptoms included:
- API response times increased from 50ms average to 5000ms+
- Packet loss between 40-60% on inter-region traffic
- TCP connection timeouts and retries
- Service mesh (Istio) reporting widespread connectivity failures
- Database replication lag spiking to 15+ minutes
- Message queue (Kafka) consumer lag growing exponentially

**Technical Details:**
The ISP experienced a BGP configuration error that caused them to announce incorrect routes for several major cloud provider IP ranges, including AWS. This caused:
1. Traffic destined for AWS to be routed through suboptimal paths
2. Asymmetric routing where outbound and inbound traffic took different paths
3. Packet loss due to congested links in the incorrect routing path
4. Increased latency as traffic traversed additional hops
5. TCP connection failures due to timeout and retransmission issues

The issue was compounded by our microservices architecture where services make numerous inter-service calls. Each service call experienced the network degradation, leading to:
- Cascading timeouts across the service mesh
- Circuit breakers opening across 80% of services
- Request queues backing up
- Memory pressure from connection pool exhaustion
- Auto-scaling triggered but unable to help due to network issues`,
        `**Customer Impact:**
- 3 hours 42 minutes of severe service degradation
- 73% of API requests experienced high latency (>5s response time)
- 28% of API requests failed completely with timeout errors
- Payment processing success rate dropped to 45%
- Order creation success rate dropped to 52%
- User authentication intermittently failing (35% failure rate)
- Search functionality completely unavailable for 45 minutes
- Customer support overwhelmed with 1,200+ tickets
- Mobile app users experienced "No Internet Connection" errors
- Estimated 8,500 customers directly impacted

**Business Impact:**
- Estimated revenue loss: $312,000
- SLA breaches for 12 enterprise customers
- Negative press coverage and social media backlash
- Emergency customer communications required
- Potential contract penalties for SLA violations
- Brand reputation damage
- Lost customer trust

**Technical Impact:**
- 80% of microservices had circuit breakers open
- Database replication lag reached 15 minutes
- Kafka consumer lag exceeded 2 million messages
- Auto-scaling ineffective due to network constraints
- Monitoring system partially blind due to metric collection failures
- Log aggregation delayed by 30+ minutes
- 156 services affected across 3 regions
- On-call engineers from 8 teams engaged

**Regional Breakdown:**
- us-east-1: 65% degradation, primary impact on Payment and Order services
- eu-west-1: 45% degradation, primary impact on Auth and User services
- ap-southeast-1: 80% degradation, Search and Analytics completely down`,
        `**Root Cause:**
BGP route leak from upstream Tier-1 ISP caused by a configuration error during routine maintenance. The ISP accidentally announced incorrect BGP routes for AWS IP ranges, causing global routing instability. This was entirely outside our control and affected multiple companies using the same ISP and cloud provider.

**Why It Impacted Us Severely:**
1. **Tight Service Coupling:** Our microservices architecture has high inter-service communication, amplifying network issues
2. **Aggressive Timeouts:** Service timeout configurations (2s) were too aggressive for degraded network conditions
3. **Insufficient Circuit Breaker Tuning:** Circuit breakers opened too quickly, preventing recovery
4. **Single ISP Dependency:** All regions used the same upstream ISP without diverse routing
5. **Lack of Regional Isolation:** Services in one region depended on services in other regions
6. **No Graceful Degradation:** Services failed completely rather than degrading gracefully
7. **Monitoring Gaps:** Network path monitoring was insufficient to detect routing issues early

**Contributing Factors:**
- No BGP monitoring or route validation on our end
- Insufficient network redundancy and diverse routing paths
- Service mesh not configured for high-latency scenarios
- Database replication not tuned for network instability
- No automated failover to backup ISP routes
- Incident response delayed due to initial misdiagnosis (thought it was AWS issue)

**Timeline of Events:**
- 09:15:00 - Network latency spike detected across all regions
- 09:16:30 - Packet loss alerts firing, services timing out
- 09:18:00 - Circuit breakers opening across service mesh
- 09:20:00 - Incident declared, war room established
- 09:35:00 - Initially suspected AWS network issue
- 10:15:00 - Identified BGP route leak from ISP via traceroute analysis
- 10:30:00 - Contacted ISP support, escalated to network operations
- 11:45:00 - ISP rolled back BGP configuration, routes stabilizing`,
        `**Immediate Response (09:15 - 10:30):**
1. Incident detected via monitoring alerts for high latency and packet loss (09:15)
2. War room established, incident lead assigned (09:20)
3. Initial investigation focused on application layer (09:20-09:45)
4. Checked AWS Service Health Dashboard - no reported issues (09:30)
5. Performed network diagnostics: traceroute, MTR, ping tests (09:45)
6. Identified abnormal routing paths via traceroute analysis (10:00)
7. Discovered traffic routing through unexpected ASNs (10:15)
8. Confirmed BGP route leak from upstream ISP (10:20)
9. Opened critical support ticket with ISP (10:25)
10. Escalated to ISP Network Operations Center (10:30)

**Mitigation Efforts (10:30 - 11:45):**
1. Increased service timeouts from 2s to 10s to reduce failures (10:35)
2. Adjusted circuit breaker thresholds to be more tolerant (10:40)
3. Scaled up service instances to handle retry load (10:45)
4. Disabled non-critical background jobs to reduce network load (10:50)
5. Implemented request prioritization for critical paths (11:00)
6. Enabled read-only mode for non-essential services (11:10)
7. Configured services to prefer local region resources (11:20)
8. Continuous communication with ISP for status updates (10:30-11:45)
9. ISP identified and rolled back problematic BGP configuration (11:30)
10. Network routes began stabilizing (11:45)
11. Latency and packet loss returning to normal levels (11:50)

**Full Resolution (11:45 - 12:57):**
1. Monitored network metrics returning to baseline (11:45-12:00)
2. Gradually restored circuit breaker settings (12:00)
3. Restored service timeouts to normal values (12:10)
4. Scaled services back to normal capacity (12:15)
5. Re-enabled background jobs and batch processing (12:20)
6. Verified database replication caught up (12:30)
7. Confirmed Kafka consumer lag processing (12:35)
8. Validated all services operating normally (12:45)
9. Ran synthetic transaction tests across all regions (12:50)
10. Incident marked as resolved (12:57)

**Post-Incident (12:57 - 14:00):**
1. Customer communication sent explaining the outage (13:00)
2. Detailed network analysis and packet captures archived (13:15)
3. Documented ISP incident reference number for SLA claims (13:20)
4. Reviewed and prioritized action items (13:30)
5. Scheduled post-mortem for next day (13:45)
6. Incident closed after final verification (14:00)`
      ]
    );
    
    const incident2Id = incident2Result.rows[0].id;
    console.log('Created Incident 2:', incident2Result.rows[0].incident_number);

    // Timeline events for Incident 2
    const incident2Timeline = [
      { type: 'detected', desc: 'Network latency spike detected across all regions. API response times increased from 50ms to 5000ms+. Packet loss at 40-60%.', user: 'frank.miller@company.com', time: '2024-12-03T09:15:00Z' },
      { type: 'investigation', desc: 'War room established. Circuit breakers opening across 80% of services. Initial investigation focused on application layer.', user: 'david.brown@company.com', time: '2024-12-03T09:20:00Z' },
      { type: 'investigation', desc: 'Checked AWS Service Health Dashboard - no reported issues. Performing network diagnostics.', user: 'frank.miller@company.com', time: '2024-12-03T09:30:00Z' },
      { type: 'investigation', desc: 'Traceroute analysis reveals abnormal routing paths. Traffic routing through unexpected ASNs. Suspected BGP issue.', user: 'frank.miller@company.com', time: '2024-12-03T10:00:00Z' },
      { type: 'investigation', desc: 'Confirmed BGP route leak from upstream ISP. Root cause identified as ISP configuration error.', user: 'frank.miller@company.com', time: '2024-12-03T10:20:00Z' },
      { type: 'communication', desc: 'Opened critical support ticket with ISP. Escalated to ISP Network Operations Center.', user: 'david.brown@company.com', time: '2024-12-03T10:30:00Z' },
      { type: 'action', desc: 'Increased service timeouts to 10s and adjusted circuit breaker thresholds to reduce failures during network degradation.', user: 'grace.wilson@company.com', time: '2024-12-03T10:35:00Z' },
      { type: 'action', desc: 'Scaled up service instances and disabled non-critical background jobs to reduce network load.', user: 'grace.wilson@company.com', time: '2024-12-03T10:50:00Z' },
      { type: 'action', desc: 'Implemented request prioritization for critical paths. Enabled read-only mode for non-essential services.', user: 'henry.moore@company.com', time: '2024-12-03T11:00:00Z' },
      { type: 'communication', desc: 'ISP identified problematic BGP configuration and initiated rollback procedure.', user: 'david.brown@company.com', time: '2024-12-03T11:30:00Z' },
      { type: 'mitigated', desc: 'ISP rolled back BGP configuration. Network routes stabilizing. Latency and packet loss returning to normal.', user: 'david.brown@company.com', time: '2024-12-03T11:45:00Z' },
      { type: 'action', desc: 'Gradually restoring circuit breaker settings and service timeouts to normal values.', user: 'grace.wilson@company.com', time: '2024-12-03T12:00:00Z' },
      { type: 'action', desc: 'Database replication caught up. Kafka consumer lag processing. All services operating normally.', user: 'henry.moore@company.com', time: '2024-12-03T12:30:00Z' },
      { type: 'resolved', desc: 'All systems verified operational. Synthetic transaction tests passing across all regions. Incident resolved.', user: 'david.brown@company.com', time: '2024-12-03T12:57:00Z' },
      { type: 'communication', desc: 'Customer communication sent explaining the network outage and ISP issue.', user: 'emma.davis@company.com', time: '2024-12-03T13:00:00Z' },
    ];

    for (const event of incident2Timeline) {
      await pool.query(
        `INSERT INTO timeline_events (incident_id, event_type, description, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [incident2Id, event.type, event.desc, userIds[event.user], event.time]
      );
    }

    // Action items for Incident 2
    const incident2Actions = [
      { desc: 'Implement BGP monitoring and route validation to detect routing anomalies', user: 'frank.miller@company.com', completed: false },
      { desc: 'Establish diverse routing with secondary ISP for network redundancy', user: 'frank.miller@company.com', completed: false },
      { desc: 'Tune service timeouts and circuit breakers for high-latency scenarios', user: 'grace.wilson@company.com', completed: true },
      { desc: 'Implement graceful degradation patterns across all critical services', user: 'grace.wilson@company.com', completed: false },
      { desc: 'Improve regional isolation to reduce cross-region dependencies', user: 'henry.moore@company.com', completed: false },
      { desc: 'Enhance network monitoring with path analysis and latency tracking', user: 'frank.miller@company.com', completed: true },
      { desc: 'Create runbook for network-related incidents with ISP escalation procedures', user: 'david.brown@company.com', completed: true },
      { desc: 'Review and update SLA agreements with ISP, document incident for claims', user: 'david.brown@company.com', completed: true },
    ];

    for (const action of incident2Actions) {
      await pool.query(
        `INSERT INTO action_items (incident_id, description, assigned_to_id, completed)
         VALUES ($1, $2, $3, $4)`,
        [incident2Id, action.desc, userIds[action.user], action.completed]
      );
    }

    // Link services to Incident 2
    const incident2Services = ['Payment API', 'Order Processing API', 'User Auth API', 'Inventory API'];
    for (const serviceName of incident2Services) {
      await pool.query(
        `INSERT INTO incident_services (incident_id, runbook_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [incident2Id, runbookIds[serviceName]]
      );
    }

    console.log('Created Incident 2 with timeline and action items');

    // ============================================================================
    // INCIDENT 3: Failed Deployment Fixed with Hotfix Canary
    // ============================================================================
    console.log('Creating Incident 3: Failed Deployment with Canary Hotfix...');
    
    const incident3Result = await pool.query(
      `INSERT INTO incidents (
        incident_number, title, description, severity, status,
        incident_lead_id, reporter_id, created_at, detected_at,
        mitigated_at, resolved_at, closed_at, problem_statement, impact, causes, steps_to_resolve
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (incident_number) DO UPDATE SET
        title = $2, description = $3, severity = $4, status = $5
      RETURNING *`,
      [
        'INC-2025-001',
        'Payment API Outage - Failed Deployment Rollback via Canary Hotfix',
        'Critical payment processing outage caused by failed deployment of v2.8.0 that introduced a memory leak and database connection pool exhaustion. Initial rollback failed due to database migration incompatibility. Resolved via emergency canary hotfix deployment of v2.8.1 with connection pool fixes.',
        'critical',
        'resolved',
        userIds['alice.johnson@company.com'],
        userIds['grace.wilson@company.com'],
        '2025-01-08T16:45:00Z',
        '2025-01-08T16:45:00Z',
        '2025-01-08T18:20:00Z',
        '2025-01-08T19:15:00Z',
        '2025-01-08T20:30:00Z',
        `At 16:45 UTC on January 8, 2025, the Payment API experienced a critical outage following the deployment of version 2.8.0 to production. The deployment introduced two critical bugs: a memory leak and database connection pool exhaustion. Initial rollback failed due to database migration incompatibility, requiring an emergency canary hotfix deployment.`,
        `**Customer Impact:**
- 1 hour 35 minutes of complete payment processing outage
- 100% of payment transactions failed during peak hours
- Estimated 4,892 failed payment attempts
- 2,347 customers unable to complete purchases
- Estimated revenue loss: $245,000`,
        `**Root Cause:**
Two critical bugs were introduced in the v2.8.0 release: a memory leak in payment validation logic and a connection pool bug where connections were not properly released in error scenarios.`,
        `**Resolution:**
Emergency hotfix v2.8.1 was developed and deployed using canary deployment strategy (10% → 25% → 50% → 100%) to safely restore service without database rollback.`
      ]
    );
    
    const incident3Id = incident3Result.rows[0].id;
    console.log('Created Incident 3:', incident3Result.rows[0].incident_number);

    // Timeline events for Incident 3
    const incident3Timeline = [
      { type: 'detected', desc: 'Payment API connection pool exhaustion detected. 100% of payment transactions failing.', user: 'grace.wilson@company.com', time: '2025-01-08T16:45:00Z' },
      { type: 'investigation', desc: 'War room established. Memory usage at 95%, connection pool exhausted.', user: 'alice.johnson@company.com', time: '2025-01-08T16:50:00Z' },
      { type: 'investigation', desc: 'Rollback to v2.7.5 failed - application incompatible with new database schema.', user: 'bob.smith@company.com', time: '2025-01-08T17:15:00Z' },
      { type: 'action', desc: 'Decision made to roll forward with emergency hotfix. Creating v2.8.1 with bug fixes.', user: 'alice.johnson@company.com', time: '2025-01-08T17:15:00Z' },
      { type: 'action', desc: 'Fixed memory leak and connection pool bug. Built and tested v2.8.1 hotfix.', user: 'bob.smith@company.com', time: '2025-01-08T17:50:00Z' },
      { type: 'action', desc: 'Canary deployment at 10%. Monitoring metrics - memory stable, connections healthy.', user: 'carol.williams@company.com', time: '2025-01-08T17:55:00Z' },
      { type: 'action', desc: 'Increased canary to 50%. Metrics looking good. Proceeding with full deployment.', user: 'carol.williams@company.com', time: '2025-01-08T18:15:00Z' },
      { type: 'mitigated', desc: 'Deployed v2.8.1 to 100% of instances. Service fully restored. Payment success rate at 100%.', user: 'alice.johnson@company.com', time: '2025-01-08T18:20:00Z' },
      { type: 'resolved', desc: 'All systems verified operational. End-to-end payment tests passing. Incident resolved.', user: 'alice.johnson@company.com', time: '2025-01-08T19:15:00Z' },
    ];

    for (const event of incident3Timeline) {
      await pool.query(
        `INSERT INTO timeline_events (incident_id, event_type, description, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [incident3Id, event.type, event.desc, userIds[event.user], event.time]
      );
    }

    // Action items for Incident 3
    const incident3Actions = [
      { desc: 'Implement mandatory canary deployments for all production releases', user: 'carol.williams@company.com', completed: true },
      { desc: 'Extend load testing duration to minimum 2 hours to catch memory leaks', user: 'bob.smith@company.com', completed: true },
      { desc: 'Add automated memory leak detection to CI/CD pipeline', user: 'bob.smith@company.com', completed: false },
      { desc: 'Implement connection pool monitoring with automatic alerts', user: 'grace.wilson@company.com', completed: true },
      { desc: 'Decouple database migrations from application deployments', user: 'bob.smith@company.com', completed: false },
      { desc: 'Document emergency hotfix and canary deployment procedures', user: 'alice.johnson@company.com', completed: true },
    ];

    for (const action of incident3Actions) {
      await pool.query(
        `INSERT INTO action_items (incident_id, description, assigned_to_id, completed)
         VALUES ($1, $2, $3, $4)`,
        [incident3Id, action.desc, userIds[action.user], action.completed]
      );
    }

    // Link services to Incident 3
    const incident3Services = ['Payment API', 'Order Processing API', 'Billing API'];
    for (const serviceName of incident3Services) {
      await pool.query(
        `INSERT INTO incident_services (incident_id, runbook_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [incident3Id, runbookIds[serviceName]]
      );
    }

    console.log('Created Incident 3 with timeline and action items');

    // ============================================================================
    // INCIDENT 4: Redis Cache Cluster Failure - Memory Exhaustion
    // ============================================================================
    console.log('Creating Incident 4: Redis Cache Cluster Failure...');
    
    const incident4Result = await pool.query(
      `INSERT INTO incidents (
        incident_number, title, description, severity, status,
        incident_lead_id, reporter_id, created_at, detected_at,
        mitigated_at, resolved_at, closed_at, problem_statement, impact, causes, steps_to_resolve
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (incident_number) DO UPDATE SET
        title = $2, description = $3, severity = $4, status = $5
      RETURNING *`,
      [
        'INC-2025-002',
        'Redis Cache Cluster Failure - Memory Exhaustion from Runaway Cache Keys',
        'Critical outage of Redis cache cluster serving user sessions and API rate limiting. Memory exhaustion caused by runaway cache key generation bug in Search API that created millions of uncapped cache entries. Resulted in Redis cluster failure, forcing fallback to database causing 10x increase in database load and severe performance degradation across all services.',
        'critical',
        'resolved',
        userIds['henry.moore@company.com'],
        userIds['iris.taylor@company.com'],
        '2025-01-15T03:12:00Z',
        '2025-01-15T03:12:00Z',
        '2025-01-15T04:45:00Z',
        '2025-01-15T06:20:00Z',
        '2025-01-15T08:00:00Z',
        `At 03:12 UTC on January 15, 2025, our Redis cache cluster (ElastiCache) experienced complete memory exhaustion and subsequent failure. The root cause was a bug in the Search API v3.2.1 release deployed 8 hours earlier that generated cache keys without proper TTL or cardinality limits.

**What Happened:**
The Search API began creating cache keys for every unique search query combination including timestamps, user IDs, and pagination parameters. Instead of creating bounded cache keys (e.g., "search:term:electronics"), it created unbounded keys like "search:electronics:user-12345:page-1:timestamp-1705286400:sort-price-asc:...".

Within 8 hours, the bug generated:
- 47 million unique cache keys (normal: ~500K)
- Memory usage grew from 40% to 100%
- Redis cluster entered OOM (Out of Memory) state
- Cache eviction couldn't keep up (maxmemory-policy: allkeys-lru)
- Redis started rejecting writes and eventually crashed
- All 6 Redis nodes in the cluster became unavailable

**Cascading Impact:**
When Redis failed, applications fell back to database for:
- User session storage (normally 100% cached)
- API rate limiting counters (normally 100% cached)  
- Search results (normally 95% cache hit rate)
- Product catalog data (normally 80% cached)

This caused:
- Database CPU jumped from 45% to 98%
- Query latency increased from 5ms to 800ms average
- Connection pool exhaustion on database
- Auto-scaling triggered but couldn't provision fast enough
- Cascading slowdowns across all services
- Timeouts and 503 errors across the platform`,
        `**Customer Impact:**
- 3 hours 8 minutes of severe performance degradation
- 52% of API requests experienced high latency (>3s response time)
- 18% of API requests failed with timeout or 503 errors
- User login sessions randomly invalidated requiring re-authentication
- Search functionality degraded with 5-10 second response times
- API rate limiting inconsistent, some users hitting false rate limits
- Mobile app experienced frequent "Something went wrong" errors
- Estimated 12,000 customers impacted
- 847 customer support tickets created during incident

**Business Impact:**
- Estimated revenue loss: $178,000
- Payment completion rate dropped 23%
- Cart abandonment rate increased 34%
- Customer satisfaction score dropped significantly
- Multiple enterprise customers complained about service reliability
- Social media complaints about "broken search"

**Technical Impact:**
- Redis cluster completely unavailable for 1h 33min
- Database load increased 10x causing performance degradation
- Database connection pool exhausted on 23 application instances
- Cache hit rate dropped from 85% to 0%
- All services affected by slow database queries
- Search API generated 47M invalid cache keys consuming 89GB memory
- Emergency Redis cluster rebuild required
- 5 teams involved in incident response

**Affected Services:**
- User Auth API (session storage failures, 45% degradation)
- Payment API (rate limiting issues, 28% degradation)
- Search API (complete cache miss, 90% degradation)
- Order Processing API (slow product lookups, 35% degradation)
- Analytics API (slow query performance, 25% degradation)
- All services using database fallback`,
        `**Root Cause:**
A code change in Search API v3.2.1 modified the cache key generation logic to include additional parameters for improved cache granularity. However, the implementation had critical flaws:

1. **No TTL Set:** Cache keys were created without expiration times (should be 1-24 hours)
2. **Unbounded Cardinality:** Cache keys included high-cardinality values (timestamps, user IDs)
3. **No Cache Key Limits:** No circuit breaker on cache key creation rate
4. **Missing Code Review:** Change bypassed senior engineer review
5. **Insufficient Testing:** Load testing didn't simulate realistic search patterns
6. **No Cache Monitoring:** Cache key count and cardinality not monitored

**Why It Wasn't Caught:**
- Code review was skipped due to "minor bug fix" classification
- Staging environment has much smaller Redis instances (didn't hit limits)
- Load tests ran for only 10 minutes (not enough to see memory growth)
- No alerts configured for cache key count or memory growth rate
- Redis monitoring focused on hit rate and latency, not key count`,
        `**Resolution Steps:**
1. Identified Redis cluster failure and database overload (3:12 UTC)
2. Analyzed Redis memory dump and discovered 47M keys (3:25 UTC)
3. Traced cache keys back to Search API deployment (3:40 UTC)
4. Emergency rollback of Search API to v3.2.0 (3:55 UTC)
5. Stopped new cache key generation, but Redis still unavailable (4:00 UTC)
6. Decision made to rebuild Redis cluster with clean state (4:15 UTC)
7. Launched new Redis cluster and migrated traffic (4:30 UTC)
8. Database load began decreasing as cache rebuilt (4:45 UTC - MITIGATED)
9. Cache hit rate recovered to 80% (5:30 UTC)
10. All services returned to normal performance (6:20 UTC - RESOLVED)
11. Post-mortem analysis and action items created (8:00 UTC - CLOSED)`
      ]
    );
    
    const incident4Id = incident4Result.rows[0].id;
    console.log('Created Incident 4:', incident4Result.rows[0].incident_number);

    // Timeline events for Incident 4
    const incident4Timeline = [
      { type: 'detected', desc: 'Redis cluster memory at 100%, nodes becoming unresponsive. Database CPU spiking to 98%.', user: 'iris.taylor@company.com', time: '2025-01-15T03:12:00Z' },
      { type: 'investigation', desc: 'War room established. Redis showing 47M keys (normal: 500K). Identified memory exhaustion.', user: 'henry.moore@company.com', time: '2025-01-15T03:25:00Z' },
      { type: 'investigation', desc: 'Analyzed cache key patterns. All malformed keys originated from Search API v3.2.1 deployed at 19:00 yesterday.', user: 'jack.anderson@company.com', time: '2025-01-15T03:40:00Z' },
      { type: 'action', desc: 'Emergency rollback of Search API from v3.2.1 to v3.2.0 to stop generating bad cache keys.', user: 'henry.moore@company.com', time: '2025-01-15T03:55:00Z' },
      { type: 'action', desc: 'Redis still failing. Too many keys to evict. Decision: rebuild Redis cluster from scratch.', user: 'henry.moore@company.com', time: '2025-01-15T04:15:00Z' },
      { type: 'action', desc: 'Launched new Redis cluster. Migrating traffic gradually while cache warms up.', user: 'jack.anderson@company.com', time: '2025-01-15T04:30:00Z' },
      { type: 'mitigated', desc: 'New Redis cluster operational. Database load dropping as cache hit rate improves. Services stabilizing.', user: 'henry.moore@company.com', time: '2025-01-15T04:45:00Z' },
      { type: 'action', desc: 'Cache hit rate at 80% and climbing. Service latency back to acceptable levels.', user: 'jack.anderson@company.com', time: '2025-01-15T05:30:00Z' },
      { type: 'resolved', desc: 'All services at normal performance. Cache hit rate at 85%. Database load at 50%. Incident resolved.', user: 'henry.moore@company.com', time: '2025-01-15T06:20:00Z' },
    ];

    for (const event of incident4Timeline) {
      await pool.query(
        `INSERT INTO timeline_events (incident_id, event_type, description, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [incident4Id, event.type, event.desc, userIds[event.user], event.time]
      );
    }

    // Action items for Incident 4
    const incident4Actions = [
      { desc: 'Add cache key count and cardinality monitoring with alerts', user: 'jack.anderson@company.com', completed: true },
      { desc: 'Implement mandatory TTL for all cache keys (enforce at framework level)', user: 'henry.moore@company.com', completed: true },
      { desc: 'Add cache key naming convention validation in CI/CD pipeline', user: 'jack.anderson@company.com', completed: false },
      { desc: 'Require senior engineer approval for cache-related code changes', user: 'alice.johnson@company.com', completed: true },
      { desc: 'Extend load testing to 24 hours for services using Redis', user: 'bob.smith@company.com', completed: false },
      { desc: 'Implement cache circuit breaker to prevent runaway key generation', user: 'henry.moore@company.com', completed: false },
      { desc: 'Add Redis memory growth rate alerts (>10% per hour)', user: 'iris.taylor@company.com', completed: true },
    ];

    for (const action of incident4Actions) {
      await pool.query(
        `INSERT INTO action_items (incident_id, description, assigned_to_id, completed)
         VALUES ($1, $2, $3, $4)`,
        [incident4Id, action.desc, userIds[action.user], action.completed]
      );
    }

    // Link services to Incident 4
    const incident4Services = ['Search API', 'User Auth API', 'Payment API', 'Order Processing API', 'Analytics API'];
    for (const serviceName of incident4Services) {
      await pool.query(
        `INSERT INTO incident_services (incident_id, runbook_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [incident4Id, runbookIds[serviceName]]
      );
    }

    console.log('Created Incident 4 with timeline and action items');

    // ============================================================================
    // INCIDENT 5: Elasticsearch Cluster Split-Brain - Network Partition
    // ============================================================================
    console.log('Creating Incident 5: Elasticsearch Split-Brain...');
    
    const incident5Result = await pool.query(
      `INSERT INTO incidents (
        incident_number, title, description, severity, status,
        incident_lead_id, reporter_id, created_at, detected_at,
        mitigated_at, resolved_at, closed_at, problem_statement, impact, causes, steps_to_resolve
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (incident_number) DO UPDATE SET
        title = $2, description = $3, severity = $4, status = $5
      RETURNING *`,
      [
        'INC-2025-003',
        'Elasticsearch Split-Brain Incident - Search and Recommendation Services Down',
        'Major outage of search and recommendation services caused by Elasticsearch cluster split-brain condition following network partition between availability zones. Two competing master nodes caused index corruption, inconsistent search results, and eventually complete search service failure. Required full cluster rebuild and reindexing of 450GB product catalog.',
        'high',
        'resolved',
        userIds['emma.davis@company.com'],
        userIds['jack.anderson@company.com'],
        '2025-01-20T11:28:00Z',
        '2025-01-20T11:28:00Z',
        '2025-01-20T14:50:00Z',
        '2025-01-20T18:35:00Z',
        '2025-01-20T21:00:00Z',
        `At 11:28 UTC on January 20, 2025, our Elasticsearch cluster experienced a split-brain condition caused by a network partition between AWS availability zones us-east-1a and us-east-1b. This resulted in two competing master nodes making conflicting cluster state decisions, leading to index corruption and complete search service failure.

**What Happened:**
Our Elasticsearch cluster consists of 9 nodes (3 master-eligible, 6 data nodes) distributed across 3 availability zones. A network connectivity issue between AZs caused the cluster to partition into two groups:
- Group A (AZ-1a): 2 master nodes + 3 data nodes
- Group B (AZ-1b + AZ-1c): 1 master node + 3 data nodes

Both groups elected a master node and began accepting writes independently, causing:

1. **Index Divergence:** Product catalog updates went to different masters
2. **Shard Allocation Conflicts:** Shards were reallocated differently in each partition
3. **Data Inconsistency:** Search results varied depending on which partition was queried
4. **Replication Failures:** Cross-AZ replication broke down
5. **Cluster State Corruption:** When network recovered, conflicting cluster states couldn't merge

**Timeline of Failure:**
- 11:28 - Network partition occurs between AZs
- 11:29 - Both groups elect masters, split-brain condition begins
- 11:35 - Search API starts returning inconsistent results
- 11:42 - Recommendation Engine fails due to missing indices
- 12:10 - Cluster state becomes corrupted when partition heals
- 12:15 - Elasticsearch enters red state, indices unavailable
- 12:30 - Search API returns 503 errors, complete service failure`,
        `**Customer Impact:**
- 4 hours 22 minutes of search service outage (CRITICAL feature)
- 7 hours 7 minutes until full restoration including recommendations
- 100% of search requests failed (0 products found)
- 100% of product recommendation requests failed
- Category browsing degraded (no sorting or filtering)
- "Products you might like" sections empty across site
- Estimated 28,000 customers unable to search for products
- 1,234 customers contacted support about broken search
- Mobile app search completely non-functional

**Business Impact:**
- Estimated revenue loss: $425,000 (search drives 65% of purchases)
- Conversion rate dropped 78% during outage
- Average order value decreased 45% (users couldn't find products)
- SEO impact: Google recrawled site during outage
- Competitive disadvantage during key shopping period
- Customer frustration evident in social media mentions

**Technical Impact:**
- Elasticsearch cluster in red state for 3.5 hours
- 47 indices corrupted with conflicting shard allocations
- 450GB of product catalog data requiring reindexing
- Search API completely down (100% failure rate)
- Recommendation Engine offline for 7+ hours
- Product catalog indexing pipeline backed up
- Real-time inventory updates not reflected in search
- 12 hours of search relevance tuning lost
- Monitoring system partially affected (uses Elasticsearch)

**Affected Services:**
- Search API (100% failure - CRITICAL)
- Recommendation Engine (100% failure - CRITICAL)
- Analytics API (partial - uses Elasticsearch for queries, 40% degradation)
- Product Catalog API (degraded - search fallback unavailable)`,
        `**Root Cause:**
Network partition between AWS availability zones caused Elasticsearch split-brain condition. The cluster's minimum_master_nodes setting was incorrectly configured at 2 instead of 3 (quorum for 3 master-eligible nodes should be 2, but requires proper quorum configuration for split-brain prevention).

**Technical Details:**
1. **Incorrect Quorum Configuration:** minimum_master_nodes set to 2 (should be (N/2)+1 = 2 for 3 masters, but our deployment actually allowed split-brain)
2. **Network Partition:** Transient network issue between AZs lasted 15 minutes
3. **Multiple Masters Elected:** Both partitions had quorum (2 and 1 nodes incorrectly both elected)
4. **Conflicting Operations:** Both masters accepted writes and shard reallocations
5. **Merge Conflict:** When network healed, cluster states couldn't reconcile
6. **Cascading Failure:** Cluster entered red state, indices became unavailable

**Why It Wasn't Prevented:**
- Elasticsearch 6.x version (older, pre-7.x auto-quorum improvements)
- Configuration not validated against best practices
- Chaos engineering tests didn't include AZ network partitions
- No automated split-brain detection and prevention
- Insufficient monitoring of master node elections
- Lack of circuit breakers in Search API during Elasticsearch failures`,
        `**Resolution Steps:**
1. Detected split-brain via monitoring alerts for multiple master nodes (11:28 UTC)
2. Identified network partition between AZs and cluster state divergence (11:45 UTC)
3. Attempted automatic cluster recovery - failed due to state conflicts (12:00 UTC)
4. Decision made to rebuild cluster from latest snapshot (12:30 UTC)
5. Stopped all Search API traffic to prevent further corruption (12:45 UTC)
6. Shut down Elasticsearch cluster completely (13:00 UTC)
7. Deployed new 9-node cluster with corrected quorum settings (13:30 UTC)
8. Restored indices from hourly snapshot taken at 11:00 UTC (14:00 UTC)
9. Reindexed delta changes from last 28 minutes using Kafka replay (14:30 UTC)
10. Search API traffic gradually restored with circuit breakers (14:50 UTC - MITIGATED)
11. Recommendation Engine brought back online after model warm-up (16:00 UTC)
12. Full reindexing completed, all services verified operational (18:35 UTC - RESOLVED)
13. Post-incident review and documentation (21:00 UTC - CLOSED)`
      ]
    );
    
    const incident5Id = incident5Result.rows[0].id;
    console.log('Created Incident 5:', incident5Result.rows[0].incident_number);

    // Timeline events for Incident 5
    const incident5Timeline = [
      { type: 'detected', desc: 'Multiple Elasticsearch master nodes detected. Alert fired: "Potential split-brain condition".', user: 'jack.anderson@company.com', time: '2025-01-20T11:28:00Z' },
      { type: 'investigation', desc: 'Confirmed network partition between AZ-1a and AZ-1b. Two master nodes active with conflicting cluster states.', user: 'emma.davis@company.com', time: '2025-01-20T11:45:00Z' },
      { type: 'investigation', desc: 'Search returning inconsistent results. Some queries show products from Group A state, others from Group B state.', user: 'jack.anderson@company.com', time: '2025-01-20T11:50:00Z' },
      { type: 'action', desc: 'Network partition healed but cluster states cannot merge. Elasticsearch cluster entered red state.', user: 'emma.davis@company.com', time: '2025-01-20T12:10:00Z' },
      { type: 'action', desc: 'Attempted automatic recovery failed. 47 indices corrupted. Decision: rebuild cluster from snapshot.', user: 'emma.davis@company.com', time: '2025-01-20T12:30:00Z' },
      { type: 'action', desc: 'Search API put in maintenance mode. All search traffic stopped to prevent further issues.', user: 'frank.miller@company.com', time: '2025-01-20T12:45:00Z' },
      { type: 'action', desc: 'Elasticsearch cluster completely shut down. Deploying new cluster with corrected quorum configuration.', user: 'emma.davis@company.com', time: '2025-01-20T13:00:00Z' },
      { type: 'action', desc: 'New 9-node cluster deployed with minimum_master_nodes properly configured for split-brain prevention.', user: 'emma.davis@company.com', time: '2025-01-20T13:30:00Z' },
      { type: 'action', desc: 'Restoring indices from 11:00 UTC snapshot. Replaying Kafka events to recover last 28 minutes of changes.', user: 'jack.anderson@company.com', time: '2025-01-20T14:00:00Z' },
      { type: 'mitigated', desc: 'Search API restored with circuit breakers enabled. Basic search functionality operational. Recommendations still offline.', user: 'emma.davis@company.com', time: '2025-01-20T14:50:00Z' },
      { type: 'action', desc: 'Recommendation Engine ML models warming up. Loading product embeddings and similarity indices.', user: 'jack.anderson@company.com', time: '2025-01-20T16:00:00Z' },
      { type: 'resolved', desc: 'All services fully operational. Search relevance verified. Recommendations producing results. Full functionality restored.', user: 'emma.davis@company.com', time: '2025-01-20T18:35:00Z' },
    ];

    for (const event of incident5Timeline) {
      await pool.query(
        `INSERT INTO timeline_events (incident_id, event_type, description, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [incident5Id, event.type, event.desc, userIds[event.user], event.time]
      );
    }

    // Action items for Incident 5
    const incident5Actions = [
      { desc: 'Upgrade Elasticsearch to version 7.x with improved split-brain protection', user: 'emma.davis@company.com', completed: false },
      { desc: 'Implement automated split-brain detection and cluster shutdown', user: 'jack.anderson@company.com', completed: true },
      { desc: 'Add chaos engineering tests for AZ network partitions', user: 'bob.smith@company.com', completed: false },
      { desc: 'Configure circuit breakers in Search API for Elasticsearch failures', user: 'frank.miller@company.com', completed: true },
      { desc: 'Increase snapshot frequency from hourly to every 15 minutes', user: 'emma.davis@company.com', completed: true },
      { desc: 'Document Elasticsearch disaster recovery procedures with runbooks', user: 'alice.johnson@company.com', completed: true },
      { desc: 'Implement search fallback mechanism using read replicas or cached results', user: 'frank.miller@company.com', completed: false },
      { desc: 'Review and validate all distributed system quorum configurations', user: 'henry.moore@company.com', completed: false },
    ];

    for (const action of incident5Actions) {
      await pool.query(
        `INSERT INTO action_items (incident_id, description, assigned_to_id, completed)
         VALUES ($1, $2, $3, $4)`,
        [incident5Id, action.desc, userIds[action.user], action.completed]
      );
    }

    // Link services to Incident 5
    const incident5Services = ['Search API', 'Recommendation Engine', 'Analytics API'];
    for (const serviceName of incident5Services) {
      await pool.query(
        `INSERT INTO incident_services (incident_id, runbook_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [incident5Id, runbookIds[serviceName]]
      );
    }

    console.log('Created Incident 5 with timeline and action items');

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
