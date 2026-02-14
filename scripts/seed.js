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

    // ============================================================================
    // INCIDENT 6: Backup System Failure - Critical Recovery Point Lost
    // ============================================================================
    console.log('Creating Incident 6: Backup System Failure...');
    
    const incident6Result = await pool.query(
      `INSERT INTO incidents (
        incident_number, title, description, severity, status,
        incident_lead_id, reporter_id, created_at, detected_at,
        mitigated_at, resolved_at, closed_at, problem_statement, impact, causes, steps_to_resolve
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (incident_number) DO UPDATE SET
        title = $2, description = $3, severity = $4, status = $5
      RETURNING *`,
      [
        'INC-2025-004',
        'Backup System Catastrophic Failure - All Recovery Points Lost',
        'Critical disaster recovery failure when the automated backup system experienced cascading failures, resulting in loss of all database backups for 72 hours. The primary backup system failed, the secondary backup system had been misconfigured for months, and the third (offsite) backup was found to be corrupted. Company would have faced complete data loss in case of a real disaster.',
        'critical',
        'resolved',
        userIds['carol.williams@company.com'],
        userIds['david.brown@company.com'],
        '2025-01-28T08:00:00Z',
        '2025-01-28T08:00:00Z',
        '2025-01-28T14:30:00Z',
        '2025-01-29T18:00:00Z',
        '2025-01-30T12:00:00Z',
        `At 08:00 UTC on January 28, 2025, our backup monitoring system detected that no database backups had been successfully completed in 72 hours. Investigation revealed a cascading failure across all three backup tiers:

**Primary Backup (pg_dump to S3):**
- The backup job had been failing silently for 72 hours due to a credential expiration issue
- The AWS IAM access key used for S3 uploads expired 3 days ago
- No alerting was configured for backup job failures
- The monitoring dashboard only checked if the backup script ran, not if it succeeded

**Secondary Backup (continuous WAL archiving):**
- PostgreSQL continuous archiving to S3 was misconfigured
- wal_level was set to 'replica' instead of 'archive' (missing critical WAL segments)
- This had been misconfigured during a database upgrade 6 months ago
- No monitoring existed to verify WAL archive completeness

**Tertiary Offsite Backup (cross-region):**
- The cross-region backup replication job had been failing for 2 weeks
- A network ACL change blocked the replication traffic
- The backup files appeared to exist but were discovered to be corrupted
- Last valid offsite backup was 2 weeks old

**What This Meant:**
If a real disaster had occurred (data center failure, ransomware attack, etc.), the company would have faced:
- Potential loss of up to 72 hours of data
- No way to recover the most recent transactions
- Complete business interruption for an extended period
- Regulatory compliance violations
- Massive customer data loss`,
        `**Customer Impact:**
        - Potential loss of 72 hours of customer transactions
        - 847 orders at risk of being permanently lost
        - Payment transaction records incomplete
        - Customer profile data potentially unrecoverable
        - Regulatory compliance (PCI-DSS, GDPR) potentially violated

**Business Impact:**
- Immediate crisis management activation
- Emergency backup restoration effort (72+ hours of work)
- Third-party forensic backup consultant hired ($85,000)
- Regulatory audit triggered
- Business continuity plan activated
- Executive board notification required
- Potential fines if data loss confirmed
- Customer trust severely damaged

**Technical Impact:**
- 72 hours of database backups missing
- WAL archiving incomplete for 6 months
- Cross-region backup corrupted for 2 weeks
- All three backup tiers had failed without detection
- Backup verification process was inadequate
- Monitoring gaps across all backup systems
- Manual restoration of 72 hours of data required
- 6-person team working around the clock for 3 days`,
        `**Root Cause:**
        Multiple backup system failures converged to create a catastrophic scenario where no reliable recovery point existed:

1. **Primary Backup Failure:** AWS IAM credentials expired without rotation monitoring
2. **Secondary Backup Misconfiguration:** PostgreSQL wal_level incorrectly set during upgrade
3. **Tertiary Backup Corruption:** Network ACL change blocked replication, causing incomplete backups
4. **Monitoring Failures:** No alerts for backup job failures, only for job execution
5. **Verification Gaps:** Backup files existed but were never tested for restore capability

**Contributing Factors:**
- Backup system had grown organically over 5 years without comprehensive review
- Different teams managed different backup components with no unified ownership
- Backup testing was performed quarterly but only on development data
- Cost optimization efforts had reduced backup retention and frequency
- Documentation for backup system was outdated and incomplete
- No chaos testing or backup drills performed in production
- Alert thresholds were set too loosely (backup could fail for 24h before alerting)
- Credential rotation was manual and fell through during staff transition`,
        `**Immediate Response (08:00 - 14:30):**
        1. Backup failure detected by monitoring at 08:00 UTC
        2. Emergency war room established, incident declared critical
        3. All backup systems audited simultaneously (08:30)
        4. Discovered all three backup tiers had failed (09:00)
        5. Emergency AWS credential rotation (09:30)
        6. Fixed WAL archiving configuration (10:00)
        7. Verified network ACL rules for cross-region replication (10:30)
        8. Initiated emergency manual backup of current database state (11:00)
        9. Began forensic analysis of what backup data was recoverable (12:00)
        10. Engaged third-party backup consultant for assistance (13:00)
        11. Started rebuilding backup system from scratch (14:00)
        12. Manual backup completed, verified, and stored in 3 locations (14:30 - MITIGATED)

**Recovery and Verification (14:30 - 18:00 Jan 29):**
        1. Restored from oldest available backup (2-week-old cross-region backup)
        2. Applied transaction log replay where possible from WAL archives
        3. Manually reconstructed 48 hours of data from application logs and customer records
        4. Verified data consistency across all critical tables
        5. Validated integrity of restored data with business team
        6. Confirmed 847 orders manually recoverable from customer communications
        7. All backup systems rebuilt with proper configuration
        8. Implemented comprehensive backup verification
        9. Confirmed no data loss beyond 2-week-old backup (RESOLVED)

**Post-Incident (18:00 Jan 29 - 12:00 Jan 30):**
        1. Comprehensive backup system redesign initiated
        2. All backup credentials rotated immediately
        3. Added real-time backup verification with automated restore tests
        4. Implemented backup monitoring across all three tiers
        5. Created runbook for backup system management
        6. Scheduled quarterly backup drills (including real disaster scenarios)
        7. Incident closed after final verification (CLOSED)`
      ]
    );
    
    const incident6Id = incident6Result.rows[0].id;
    console.log('Created Incident 6:', incident6Result.rows[0].incident_number);

    // Timeline events for Incident 6
    const incident6Timeline = [
      { type: 'detected', desc: 'Backup monitoring alert: No successful backups in 72 hours. All backup tiers reporting as "running" but no verification data.', user: 'david.brown@company.com', time: '2025-01-28T08:00:00Z' },
      { type: 'investigation', desc: 'Emergency war room established. Discovered credential expiration on primary backup, WAL misconfiguration on secondary, and corrupted offsite backup.', user: 'carol.williams@company.com', time: '2025-01-28T08:30:00Z' },
      { type: 'investigation', desc: 'Confirmed all three backup tiers have failed. This is a catastrophic DR scenario - we have no recoverable backups.', user: 'carol.williams@company.com', time: '2025-01-28T09:00:00Z' },
      { type: 'action', desc: 'Rotated all AWS credentials for backup system. Primary backup now functional.', user: 'david.brown@company.com', time: '2025-01-28T09:30:00Z' },
      { type: 'action', desc: 'Fixed PostgreSQL wal_level configuration from replica to archive. WAL archiving now capturing all required segments.', user: 'frank.miller@company.com', time: '2025-01-28T10:00:00Z' },
      { type: 'action', desc: 'Identified and fixed Network ACL blocking cross-region replication. Restoring offsite backup connectivity.', user: 'frank.miller@company.com', time: '2025-01-28T10:30:00Z' },
      { type: 'action', desc: 'Initiating emergency manual backup of current production database to establish new baseline.', user: 'carol.williams@company.com', time: '2025-01-28T11:00:00Z' },
      { type: 'action', desc: 'Engaged third-party backup consultant for forensic analysis and recovery assistance.', user: 'alice.johnson@company.com', time: '2025-01-28T13:00:00Z' },
      { type: 'action', desc: 'Emergency backup completed and verified in 3 separate locations. New baseline established.', user: 'carol.williams@company.com', time: '2025-01-28T14:30:00Z' },
      { type: 'mitigated', desc: 'Backup system rebuilt with proper configuration. All three tiers now operational and verified.', user: 'carol.williams@company.com', time: '2025-01-28T14:30:00Z' },
      { type: 'action', desc: 'Restored from 2-week-old offsite backup. Recovered as much data as possible from WAL archives.', user: 'frank.miller@company.com', time: '2025-01-29T10:00:00Z' },
      { type: 'action', desc: 'Manually reconstructed 48 hours of transactions from application logs. 847 orders recovered.', user: 'emma.davis@company.com', time: '2025-01-29T16:00:00Z' },
      { type: 'resolved', desc: 'All data verified consistent. Backup system operational with comprehensive monitoring. Incident resolved.', user: 'carol.williams@company.com', time: '2025-01-29T18:00:00Z' },
    ];

    for (const event of incident6Timeline) {
      await pool.query(
        `INSERT INTO timeline_events (incident_id, event_type, description, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [incident6Id, event.type, event.desc, userIds[event.user], event.time]
      );
    }

    // Action items for Incident 6
    const incident6Actions = [
      { desc: 'Implement automated credential rotation for all backup system credentials', user: 'david.brown@company.com', completed: true },
      { desc: 'Add real-time backup verification with automated restore testing', user: 'frank.miller@company.com', completed: true },
      { desc: 'Create unified backup monitoring dashboard with all three tiers', user: 'frank.miller@company.com', completed: false },
      { desc: 'Implement backup job success/failure alerts (not just execution alerts)', user: 'david.brown@company.com', completed: true },
      { desc: 'Schedule quarterly disaster recovery drills including backup restoration', user: 'carol.williams@company.com', completed: true },
      { desc: 'Document backup system architecture and ownership matrix', user: 'carol.williams@company.com', completed: false },
      { desc: 'Implement backup redundancy with geographic and architectural diversity', user: 'frank.miller@company.com', completed: false },
      { desc: 'Add backup verification to CI/CD pipeline for all database changes', user: 'carol.williams@company.com', completed: true },
    ];

    for (const action of incident6Actions) {
      await pool.query(
        `INSERT INTO action_items (incident_id, description, assigned_to_id, completed)
         VALUES ($1, $2, $3, $4)`,
        [incident6Id, action.desc, userIds[action.user], action.completed]
      );
    }

    // Link services to Incident 6
    const incident6Services = ['Payment API', 'Order Processing API', 'Billing API', 'User Auth API'];
    for (const serviceName of incident6Services) {
      await pool.query(
        `INSERT INTO incident_services (incident_id, runbook_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [incident6Id, runbookIds[serviceName]]
      );
    }

    console.log('Created Incident 6 with timeline and action items');

    // ============================================================================
    // INCIDENT 7: DNS Failover Failure - Hybrid Cloud DR Test Exposed Gaps
    // ============================================================================
    console.log('Creating Incident 7: DNS Failover Failure...');
    
    const incident7Result = await pool.query(
      `INSERT INTO incidents (
        incident_number, title, description, severity, status,
        incident_lead_id, reporter_id, created_at, detected_at,
        mitigated_at, resolved_at, closed_at, problem_statement, impact, causes, steps_to_resolve
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (incident_number) DO UPDATE SET
        title = $2, description = $3, severity = $4, status = $5
      RETURNING *`,
      [
        'INC-2025-005',
        'DNS Failover Catastrophic Failure - Hybrid Cloud DR Test Exposed Critical Gaps',
        'Planned disaster recovery drill revealed critical gaps in the DNS failover system. When testing failover from AWS to on-premises data center, DNS failover either failed to trigger or propagated incorrectly. Only 15% of users were successfully routed to the DR site, while 85% experienced complete service unavailability. The DR site was fully operational but unreachable due to DNS issues.',
        'high',
        'resolved',
        userIds['henry.moore@company.com'],
        userIds['carol.williams@company.com'],
        '2025-02-05T02:00:00Z',
        '2025-02-05T02:00:00Z',
        '2025-02-05T04:45:00Z',
        '2025-02-05T08:30:00Z',
        '2025-02-05T16:00:00Z',
        `At 02:00 UTC on February 5, 2025, the planned disaster recovery drill for the hybrid cloud architecture revealed catastrophic failures in the DNS failover system. The DR environment was fully operational and ready, but when primary AWS infrastructure was "simulated" as failed, DNS failover either failed to trigger or propagated incorrectly across the internet.

**What Was Being Tested:**
The quarterly DR drill was designed to verify:
1. Automatic DNS failover from AWS to on-premises DR site
2. Database replication from primary RDS to on-premises PostgreSQL
3. Application auto-scaling in DR environment
4. Load balancer traffic routing to DR site
5. Data consistency between primary and DR databases

**What Happened:**
At 02:00 UTC, the DR drill began:
1. Primary AWS region was "failed" (simulated via routing changes)
2. DNS failover should have triggered within 60 seconds
3. Expected: 100% of traffic routing to DR site within 5 minutes
4. Actual: DNS failover completely failed

**DNS Failover Issues:**
- Route 53 health checks were configured incorrectly (checked wrong endpoints)
- TTL values were set to 24 hours instead of 60 seconds
- The DNS failover automation had a bug in the failover logic
- Secondary DNS zone (registrar) was not integrated with Route 53
- Geo-routing policy was not configured for DR failover
- Some DNS records had "Fail" flag but were not actually removed from resolution

**Results:**
- 85% of users received no response or NXDOMAIN errors
- 15% of users were routed to DR but experienced slow/unreliable service
- The DR site was fully operational but unreachable
- Total "outage" duration: 2 hours 45 minutes
- Drill had to be aborted and rolled back`,
        `**Customer Impact (Simulated Drill):**
        - 85% of users would have experienced complete service unavailability
        - 15% would have experienced degraded service (high latency, errors)
        - Total "downtime" in real scenario: 2 hours 45 minutes
        - Customer trust in DR capabilities would be completely eroded
        - Would have triggered SLA breaches for all enterprise customers

**Business Impact:**
        - DR drill failure exposed complete inability to failover
        - Would have resulted in 2+ hours of guaranteed downtime in real disaster
        - Regulatory compliance (SOC 2, ISO 27001) would be violated
        - Enterprise customers would have contractual termination rights
        - Board-level emergency meeting required
        - $250,000 estimated cost of failed DR response
        - Insurance claim likely denied due to "unpreparedness"
        - Competitive advantage eliminated during outage

**Technical Impact:**
- Route 53 health check configuration fundamentally broken
- DNS failover automation had multiple critical bugs
- TTL values made failover impossible (24-hour cache)
- Secondary DNS not integrated - registrar DNS still pointed to failed site
- Load balancer DR configuration incomplete
- Database replication was working but unreachable due to DNS
- Application DR deployment worked but unreachable
- Only network layer failover succeeded (routing was fine)

**What Worked:**
- On-premises DR site was fully provisioned and operational
- Database replication was within 30 seconds of primary
- Application containers deployed and running in DR
- Load balancers configured and ready in DR
- Network routing between regions was functional
- Only DNS layer failed`,
        `**Root Cause:**
        Multiple failures in the DNS failover system prevented any successful failover:

1. **Incorrect Health Check Configuration:** Route 53 health checks were monitoring /health endpoints that always returned 200 OK regardless of actual service health. The health check URL was wrong.

2. **Excessive TTL Values:** DNS records had 24-hour TTLs, making it impossible to switch quickly. Even if failover triggered, cached records would persist for days.

3. **DNS Failover Logic Bug:** The custom failover automation script had a logic error where it would detect failure but not execute the actual DNS update.

4. **Missing Secondary DNS Integration:** The domain registrar's DNS (secondary) was not connected to Route 53 failover system. When Route 53 failed, traffic still tried to resolve to AWS.

5. **Geo-Routing Not Configured:** Geo-routing was not implemented, so users would be routed to nearest region regardless of health status.

6. **Insufficient Testing:** DR drills previously only tested individual components, never end-to-end DNS failover.

**Contributing Factors:**
- DNS infrastructure managed by different team than application
- No documentation on DNS failover architecture
- Previous DR drills avoided DNS testing due to complexity
- Assumptions made that "DNS failover just works"
- TTL values intentionally set high for performance (wrong priority)
- Health check endpoints tested in isolation, not as system
- No runbook existed for DNS failover execution
- Vendor (AWS) support not engaged for failover design review`,
        `**Immediate Response (02:00 - 04:45):**
        1. DR drill initiated at scheduled time (02:00 UTC)
        2. Observed DNS not failing over after 60 seconds (02:01)
        3. Emergency investigation launched (02:05)
        4. Discovered Route 53 health checks returning incorrect status (02:15)
        5. Found TTL values at 24 hours - failover impossible (02:20)
        6. Identified failover automation script bug (02:35)
        7. Manual DNS updates required to route to DR site (03:00)
        8. Some traffic began reaching DR site (03:15)
        9. Database replication verified and caught up (03:30)
        10. Application services scaled in DR to handle load (04:00)
        11. Manual DNS cache flush initiated for major ISPs (04:30)
        12. 85% of traffic finally reaching DR site (04:45 - MITIGATED)

**Full Resolution (04:45 - 08:30):**
        1. Fixed Route 53 health checks to monitor correct endpoints (05:00)
        2. Changed all DNS TTL values to 60 seconds (05:15)
        3. Fixed failover automation script logic bug (05:30)
        4. Integrated secondary DNS (registrar) with Route 53 (06:00)
        5. Implemented proper geo-routing failover policy (06:30)
        6. Tested DNS failover end-to-end successfully (07:00)
        7. Verified all services operational in DR (07:30)
        8. Rolled back to primary AWS region (08:00)
        9. Full DR drill repeated with successful failover (08:30 - RESOLVED)

**Post-Incident (08:30 - 16:00):**
        1. Comprehensive DNS failover runbook created
        2. Automated health check verification added to monitoring
        3. TTL values changed and documented in standard procedures
        4. All DR drills now mandated to include DNS failover testing
        5. AWS support engaged for DNS failover architecture review
        6. Incident closed with full DR capability verified (CLOSED)`
      ]
    );
    
    const incident7Id = incident7Result.rows[0].id;
    console.log('Created Incident 7:', incident7Result.rows[0].incident_number);

    // Timeline events for Incident 7
    const incident7Timeline = [
      { type: 'detected', desc: 'DR drill initiated. Primary region "failed" as planned. DNS failover expected to trigger within 60 seconds.', user: 'carol.williams@company.com', time: '2025-02-05T02:00:00Z' },
      { type: 'investigation', desc: 'DNS failover not triggering after 2 minutes. Emergency investigation launched.', user: 'henry.moore@company.com', time: '2025-02-05T02:05:00Z' },
      { type: 'investigation', desc: 'Route 53 health checks returning 200 OK even for failed endpoints. Health check configuration is wrong.', user: 'jack.anderson@company.com', time: '2025-02-05T02:15:00Z' },
      { type: 'investigation', desc: 'DNS TTL values are 24 hours. Even if failover triggers, cached records will persist for days.', user: 'henry.moore@company.com', time: '2025-02-05T02:20:00Z' },
      { type: 'investigation', desc: 'Found critical bug in failover automation script - detects failure but does not execute DNS update.', user: 'jack.anderson@company.com', time: '2025-02-05T02:35:00Z' },
      { type: 'action', desc: 'Initiating manual DNS failover to DR site. Updating Route 53 records directly.', user: 'henry.moore@company.com', time: '2025-02-05T03:00:00Z' },
      { type: 'action', desc: 'Manual DNS updates propagating. Some traffic reaching DR site, but cache still causing issues.', user: 'henry.moore@company.com', time: '2025-02-05T03:15:00Z' },
      { type: 'action', desc: 'Database replication verified - DR database is within 30 seconds of primary. Application containers running in DR.', user: 'frank.miller@company.com', time: '2025-02-05T03:30:00Z' },
      { type: 'action', desc: 'Scaling application services in DR to handle production load. 50% capacity reached.', user: 'frank.miller@company.com', time: '2025-02-05T04:00:00Z' },
      { type: 'action', desc: 'Initiated manual cache flush with major ISPs. DNS propagation improving.', user: 'henry.moore@company.com', time: '2025-02-05T04:30:00Z' },
      { type: 'mitigated', desc: '85% of traffic now reaching DR site. All services operational. Manual DNS failover successful.', user: 'henry.moore@company.com', time: '2025-02-05T04:45:00Z' },
      { type: 'action', desc: 'Fixed Route 53 health checks to monitor correct service health endpoints.', user: 'jack.anderson@company.com', time: '2025-02-05T05:00:00Z' },
      { type: 'action', desc: 'Changed all DNS TTL values from 24 hours to 60 seconds across all records.', user: 'henry.moore@company.com', time: '2025-02-05T05:15:00Z' },
      { type: 'action', desc: 'Fixed failover automation script - corrected the logic error that prevented DNS updates.', user: 'jack.anderson@company.com', time: '2025-02-05T05:30:00Z' },
      { type: 'action', desc: 'Integrated secondary DNS (registrar) with Route 53 failover system.', user: 'henry.moore@company.com', time: '2025-02-05T06:00:00Z' },
      { type: 'action', desc: 'Implemented geo-routing failover policy for intelligent traffic routing during failures.', user: 'henry.moore@company.com', time: '2025-02-05T06:30:00Z' },
      { type: 'action', desc: 'Tested DNS failover end-to-end - verified working correctly now.', user: 'jack.anderson@company.com', time: '2025-02-05T07:00:00Z' },
      { type: 'action', desc: 'All services verified operational in DR. Ready to rollback to primary region.', user: 'frank.miller@company.com', time: '2025-02-05T07:30:00Z' },
      { type: 'action', desc: 'Rolling back to primary AWS region. Restoring normal DNS configuration.', user: 'henry.moore@company.com', time: '2025-02-05T08:00:00Z' },
      { type: 'resolved', desc: 'Full DR drill repeated and completed successfully with proper DNS failover. All systems verified.', user: 'henry.moore@company.com', time: '2025-02-05T08:30:00Z' },
    ];

    for (const event of incident7Timeline) {
      await pool.query(
        `INSERT INTO timeline_events (incident_id, event_type, description, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [incident7Id, event.type, event.desc, userIds[event.user], event.time]
      );
    }

    // Action items for Incident 7
    const incident7Actions = [
      { desc: 'Fix Route 53 health checks to monitor actual service health endpoints', user: 'jack.anderson@company.com', completed: true },
      { desc: 'Change all DNS TTL values to 60 seconds for fast failover', user: 'henry.moore@company.com', completed: true },
      { desc: 'Fix failover automation script logic and test thoroughly', user: 'jack.anderson@company.com', completed: true },
      { desc: 'Integrate secondary DNS (registrar) with primary DNS failover system', user: 'henry.moore@company.com', completed: true },
      { desc: 'Implement proper geo-routing failover policy', user: 'henry.moore@company.com', completed: true },
      { desc: 'Create comprehensive DNS failover runbook with step-by-step procedures', user: 'carol.williams@company.com', completed: true },
      { desc: 'Mandate DNS failover testing in all future DR drills', user: 'carol.williams@company.com', completed: true },
      { desc: 'Engage AWS support for DNS failover architecture review', user: 'alice.johnson@company.com', completed: false },
    ];

    for (const action of incident7Actions) {
      await pool.query(
        `INSERT INTO action_items (incident_id, description, assigned_to_id, completed)
         VALUES ($1, $2, $3, $4)`,
        [incident7Id, action.desc, userIds[action.user], action.completed]
      );
    }

    // Link services to Incident 7
    const incident7Services = ['Payment API', 'User Auth API', 'Order Processing API', 'Search API'];
    for (const serviceName of incident7Services) {
      await pool.query(
        `INSERT INTO incident_services (incident_id, runbook_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [incident7Id, runbookIds[serviceName]]
      );
    }

    console.log('Created Incident 7 with timeline and action items');

    // ============================================================================
    // INCIDENT 8: Canary Deployment Failure - Missing Test Coverage
    // ============================================================================
    console.log('Creating Incident 8: Canary Deployment Failure...');
    
    const incident8Result = await pool.query(
      `INSERT INTO incidents (
        incident_number, title, description, severity, status,
        incident_lead_id, reporter_id, created_at, detected_at,
        mitigated_at, resolved_at, closed_at, problem_statement, impact, causes, steps_to_resolve
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (incident_number) DO UPDATE SET
        title = $2, description = $3, severity = $4, status = $5
      RETURNING *`,
      [
        'INC-2025-006',
        'Order Processing API Canary Failure - Untested Payment Integration Bug',
        'Critical production outage caused by Order Processing API v4.2.0 canary deployment that introduced a bug in payment integration logic. The bug was not caught in canary metrics because canary traffic was too small (5%) and the bug only manifested under specific payment conditions. Full rollout proceeded after canary "passed", affecting 100% of orders and causing 100% payment failures for 47 minutes.',
        'critical',
        'resolved',
        userIds['bob.smith@company.com'],
        userIds['iris.taylor@company.com'],
        '2025-02-10T14:30:00Z',
        '2025-02-10T14:30:00Z',
        '2025-02-10T15:17:00Z',
        '2025-02-10T16:45:00Z',
        '2025-02-10T18:00:00Z',
        `At 14:30 UTC on February 10, 2025, the Order Processing API v4.2.0 was deployed to production using a canary deployment strategy. The deployment passed canary analysis and was promoted to 100% rollout at 15:00 UTC. However, at 14:30 (during canary), a critical bug was introduced that caused payment integration failures.

**The Bug:**
The v4.2.0 release included a refactored payment integration module that changed how payment requests were constructed. A subtle bug in the new code caused:
- Payment requests to be constructed with incorrect currency codes for international orders
- The bug only affected orders where: currency != USD AND payment_method == "credit_card"
- This represented approximately 8% of total orders

**Why Canary Failed to Detect:**
1. Canary traffic was only 5% of total traffic (as per policy)
2. Of that 5%, only 0.4% met the bug condition (non-USD credit card orders)
3. The error rate for canary was 0.4%, which was below the 1% threshold
4. Canary metrics showed "success" because the overwhelming majority worked
5. No one manually reviewed the small error cases
6. The canary analysis was fully automated without human oversight

**What Happened:**
- 14:30: Canary deployment at 5% started
- 14:45: Canary analysis ran, showed 0.4% error rate (below 1% threshold)
- 15:00: Automated promotion to 100% rollout approved
- 15:10: Full deployment complete
- 14:30-15:17: 2,847 orders processed through canary, 12 affected (not detected)
- 15:17: Alert fires: Payment API error rate at 47% for last 5 minutes
- 15:17-16:45: All new orders failing with payment integration errors`,
        `**Customer Impact:**
        - 1 hour 28 minutes of complete order failure
        - 100% of orders placed during incident failed
        - 4,892 orders attempted, 0 successful
        - 847 customers affected, unable to complete purchases
        - Cart abandonment at 100%
        - Customer frustration evident in support tickets
        - Estimated revenue loss: $156,000

**Business Impact:**
- 100% order processing failure during peak hours
- Customer trust damaged
- Emergency customer communications required
- Sales team unable to process orders
- Competitive disadvantage
- Marketing campaign for the day completely ineffective

**Technical Impact:**
- All Order Processing API instances serving wrong payment requests
- Payment API receiving malformed payment requests
- 100% payment failures for international credit card orders
- Database filled with failed order records requiring cleanup
- Rollback to v4.1.5 required
- Re-deployment of v4.2.0 with fix needed
- Incident response required 6 engineers from 3 teams`,
        `**Root Cause:**
        Multiple factors contributed to the canary deployment failing to detect the critical bug:

1. **Insufficient Canary Traffic:** 5% canary was too small to detect a bug affecting 0.4% of total traffic (8% of canary traffic)

2. **Automated Analysis Without Human Review:** The canary analysis was fully automated and didn't trigger human review for the small error rate

3. **Metric Threshold Too High:** The 1% error rate threshold was inappropriate for a critical payment system

4. **Missing Segment Analysis:** Canary metrics didn't segment by payment method and currency, hiding the localized failure

5. **Insufficient Test Coverage:** The bug could have been caught in integration tests but those tests didn't cover international payment scenarios

6. **Code Review Gap:** The code change was reviewed but reviewer didn't catch the currency code logic error

7. **No Dark Launch:** The new payment integration wasn't tested with shadow traffic before canary

**Contributing Factors:**
- Test suite missing international payment test cases
- Canary strategy chosen based on traffic volume, not failure domain
- No segmented canary analysis by customer segment or payment type
- Pressure to deploy quickly led to skipping manual verification
- Assumption that "tests pass = safe to deploy"
- No feature flags to isolate risky payment changes`,
        `**Immediate Response (14:30 - 15:17):**
        1. Canary deployment at 5% started (14:30)
        2. Canary analysis ran showing 0.4% error rate (14:45)
        3. Automated promotion to 100% approved (15:00)
        4. Full rollout completed (15:10)
        5. Payment API error rate alert fires at 47% (15:17)
        6. Incident declared, war room established (15:17)
        7. Initial investigation shows payment request format errors (15:20)
        8. Identified v4.2.0 deployment as likely cause (15:25)

**Mitigation (15:17 - 16:45):**
        1. Decision: Rollback to v4.1.5 immediately (15:30)
        2. Rollback initiated (15:35)
        3. v4.1.5 deployed to all instances (15:45)
        4. Rollback verified - error rate dropping (15:55)
        5. Payment processing recovering (16:00)
        6. Order processing returning to normal (16:15)
        7. All systems verified operational (16:45 - RESOLVED)

**Post-Incident (16:45 - 18:00):**
        1. Analyzed failed orders - all non-USD credit card transactions (16:50)
        2. Identified currency code logic bug in v4.2.0 payment module (17:00)
        3. Created fix for the currency code handling (17:15)
        4. Added international payment test cases to test suite (17:30)
        5. Incident closed after comprehensive review (18:00)`
      ]
    );
    
    const incident8Id = incident8Result.rows[0].id;
    console.log('Created Incident 8:', incident8Result.rows[0].incident_number);

    // Timeline events for Incident 8
    const incident8Timeline = [
      { type: 'detected', desc: 'Canary deployment of Order Processing API v4.2.0 at 5% traffic started.', user: 'iris.taylor@company.com', time: '2025-02-10T14:30:00Z' },
      { type: 'action', desc: 'Canary analysis completed: 0.4% error rate - below 1% threshold. Automated promotion to 100% approved.', user: 'iris.taylor@company.com', time: '2025-02-10T14:45:00Z' },
      { type: 'action', desc: 'Full rollout of v4.2.0 to 100% initiated.', user: 'iris.taylor@company.com', time: '2025-02-10T15:00:00Z' },
      { type: 'action', desc: 'Full rollout completed. All Order Processing API instances now running v4.2.0.', user: 'iris.taylor@company.com', time: '2025-02-10T15:10:00Z' },
      { type: 'detected', desc: 'CRITICAL ALERT: Payment API error rate at 47% for last 5 minutes. All orders failing at payment processing.', user: 'iris.taylor@company.com', time: '2025-02-10T15:17:00Z' },
      { type: 'investigation', desc: 'War room established. Investigating payment request format errors from Order Processing API.', user: 'bob.smith@company.com', time: '2025-02-10T15:17:00Z' },
      { type: 'investigation', desc: 'Identified v4.2.0 deployment as likely cause - payment request malformed for international orders.', user: 'bob.smith@company.com', time: '2025-02-10T15:25:00Z' },
      { type: 'action', desc: 'Decision made to rollback to v4.1.5 immediately. Initiating rollback procedure.', user: 'bob.smith@company.com', time: '2025-02-10T15:30:00Z' },
      { type: 'action', desc: 'Rolling back to v4.1.5. Applying previous known-good version to all instances.', user: 'carol.williams@company.com', time: '2025-02-10T15:35:00Z' },
      { type: 'action', desc: 'v4.1.5 deployed to all instances. Monitoring error rates.', user: 'carol.williams@company.com', time: '2025-02-10T15:45:00Z' },
      { type: 'action', desc: 'Error rates dropping. Payment processing recovering. Services returning to normal.', user: 'carol.williams@company.com', time: '2025-02-10T15:55:00Z' },
      { type: 'mitigated', desc: 'Order processing fully restored. Payment success rate at 100%. Rollback successful.', user: 'bob.smith@company.com', time: '2025-02-10T16:00:00Z' },
      { type: 'action', desc: 'Order processing returning to normal. Verifying all orders processing correctly.', user: 'carol.williams@company.com', time: '2025-02-10T16:15:00Z' },
      { type: 'resolved', desc: 'All systems verified operational. Incident resolved. Root cause identified as currency code bug.', user: 'bob.smith@company.com', time: '2025-02-10T16:45:00Z' },
      { type: 'investigation', desc: 'Post-incident analysis: All failed orders were non-USD credit card transactions. Bug in currency handling logic.', user: 'bob.smith@company.com', time: '2025-02-10T16:50:00Z' },
      { type: 'action', desc: 'Created fix for currency code handling in payment integration module.', user: 'bob.smith@company.com', time: '2025-02-10T17:15:00Z' },
    ];

    for (const event of incident8Timeline) {
      await pool.query(
        `INSERT INTO timeline_events (incident_id, event_type, description, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [incident8Id, event.type, event.desc, userIds[event.user], event.time]
      );
    }

    // Action items for Incident 8
    const incident8Actions = [
      { desc: 'Increase canary traffic percentage for critical payment systems from 5% to 20%', user: 'iris.taylor@company.com', completed: true },
      { desc: 'Add segmented canary analysis by payment method and currency', user: 'iris.taylor@company.com', completed: true },
      { desc: 'Lower error rate threshold for canary from 1% to 0.1% for payment systems', user: 'bob.smith@company.com', completed: true },
      { desc: 'Add mandatory human review for canary analysis before promotion', user: 'carol.williams@company.com', completed: true },
      { desc: 'Add comprehensive international payment test cases to test suite', user: 'bob.smith@company.com', completed: true },
      { desc: 'Implement feature flag for risky payment integration changes', user: 'carol.williams@company.com', completed: false },
      { desc: 'Implement dark launch for payment integration changes with shadow traffic', user: 'iris.taylor@company.com', completed: false },
      { desc: 'Add automated canary analysis for specific error patterns, not just overall error rate', user: 'iris.taylor@company.com', completed: true },
    ];

    for (const action of incident8Actions) {
      await pool.query(
        `INSERT INTO action_items (incident_id, description, assigned_to_id, completed)
         VALUES ($1, $2, $3, $4)`,
        [incident8Id, action.desc, userIds[action.user], action.completed]
      );
    }

    // Link services to Incident 8
    const incident8Services = ['Order Processing API', 'Payment API', 'Billing API'];
    for (const serviceName of incident8Services) {
      await pool.query(
        `INSERT INTO incident_services (incident_id, runbook_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [incident8Id, runbookIds[serviceName]]
      );
    }

    console.log('Created Incident 8 with timeline and action items');

    // ============================================================================
    // INCIDENT 9: Release Failed - Insufficient Load Testing in Production-Like Environment
    // ============================================================================
    console.log('Creating Incident 9: Release Failed - Load Testing Gap...');
    
    const incident9Result = await pool.query(
      `INSERT INTO incidents (
        incident_number, title, description, severity, status,
        incident_lead_id, reporter_id, created_at, detected_at,
        mitigated_at, resolved_at, closed_at, problem_statement, impact, causes, steps_to_resolve
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (incident_number) DO UPDATE SET
        title = $2, description = $3, severity = $4, status = $5
      RETURNING *`,
      [
        'INC-2025-007',
        'Notification Service Release Failure - Database Connection Pool Exhausted Due to Load Test Gap',
        'Critical release failure of Notification Service v3.8.0 that caused complete notification delivery failure. The release passed all staging tests but failed in production due to significantly different load patterns. The staging environment had only 10% of production traffic volume, and the new version introduced a connection leak that only manifested under high load. Database connection pool exhausted within 30 minutes of production deployment.',
        'high',
        'resolved',
        userIds['frank.miller@company.com'],
        userIds['henry.moore@company.com'],
        '2025-02-12T10:15:00Z',
        '2025-02-12T10:15:00Z',
        '2025-02-12T11:30:00Z',
        '2025-02-12T14:00:00Z',
        '2025-02-12T16:30:00Z',
        `At 10:15 UTC on February 12, 2025, the Notification Service v3.8.0 was deployed to production. The release had passed all staging tests and was approved for production deployment. However, within 30 minutes of production deployment, database connection pool exhaustion caused complete notification delivery failure.

**What Changed in v3.8.0:**
The release included a refactored message queue consumer that improved message processing throughput. The new implementation:
- Created a new database connection for each batch of messages processed
- Failed to properly close connections when errors occurred
- Had connection leak under high-volume scenarios

**Why Staging Didn't Catch It:**
1. **Traffic Volume Difference:** Staging environment had only ~1,000 messages/hour vs. production's ~100,000 messages/hour
2. **Load Test Duration:** Load tests in staging ran for only 15 minutes, but connection leak manifests after ~20 minutes
3. **Connection Pool Size:** Staging had 50 connection pool limit vs. production's 200 (leak rate per connection was small but accumulated)
4. **Error Rate Masking:** In staging, the error rate was 0.5% (below alert threshold) but scaled linearly with traffic

**What Happened in Production:**
- 10:15: Deployment to production begins
- 10:20: New version serving 10% of traffic
- 10:25: Connection pool at 60% (growing faster than expected)
- 10:30: Connection pool exhausted (200/200 connections)
- 10:30-11:30: All notification delivery attempts fail with "connection pool exhausted" errors
- 10:45: Alert fires - notification delivery failure rate at 100%

**The Impact Scale:**
- Production has 100x more traffic than staging
- The connection leak rate was manageable at staging scale but catastrophic at production scale
- Each minute of production traffic = 1 week of staging traffic in terms of connection usage`,
        `**Customer Impact:**
        - 1 hour 15 minutes of notification delivery failure
        - 0 notifications delivered during incident
        - 45,000 email notifications queued but never sent
        - 12,000 SMS notifications failed to deliver
        - 8,500 push notifications not delivered
        - Users did not receive: order confirmations, shipping updates, password resets, security alerts
        - Customer confusion and frustration
        - 234 support tickets related to missing notifications

**Business Impact:**
- 100% notification delivery failure during business hours
- Order confirmation emails not sent - customers unsure if orders placed
- Shipping updates not delivered - increased customer support queries
- Security alerts not delivered - potential security risk
- Marketing campaign for the day was ineffective
- SMS notification revenue loss ($4,200)
- Customer trust impacted

**Technical Impact:**
- Database connection pool exhausted at 200/200 connections
- All notification workers blocked waiting for connections
- Message queue (Kafka) consumer lag grew to 50,000 messages
- PostgreSQL CPU spiked to 95% from connection overhead
- Rollback required but couldn't complete cleanly (stuck connections)
- Emergency restart of all notification service pods needed
- Manual queue drain and replay required
- 4-engineer team engaged for 5+ hours`,
        `**Root Cause:**
        The release failed due to fundamental gaps in load testing that allowed a connection leak to propagate to production:

1. **Environment Parity Gap:** Staging had 10% of production traffic volume, making load-related issues invisible

2. **Load Test Duration Too Short:** 15-minute load tests were insufficient - the connection leak only manifests after ~20 minutes of sustained load

3. **Connection Pool Not Monitored:** No specific monitoring for connection pool utilization during load tests

4. **Linear Scaling Assumption:** Assumed the leak would scale linearly and be caught, but didn't account for cumulative effect

5. **No Production-Like Load Testing:** Never performed load testing with production-volume traffic before release

6. **Code Review Gap:** The code change was reviewed but the connection management logic wasn't flagged as risky

7. **Insufficient Staging Resources:** Cost concerns led to smaller staging database, preventing production-like testing

**Contributing Factors:**
- Staging environment budget constraints
- Pressure to meet release deadline
- Previous releases "worked fine" in staging = false confidence
- No automated load testing in CI/CD pipeline
- Connection pool configuration different between staging (50) and production (200)
- Monitoring focused on success rate, not resource utilization
- No canary deployment to catch issue before full rollout`,
        `**Immediate Response (10:15 - 11:30):**
        1. Notification Service v3.8.0 deployment to production begins (10:15)
        2. New version at 10% traffic, monitoring closely (10:20)
        3. Connection pool utilization growing faster than expected (10:25)
        4. Connection pool exhausted - 200/200 connections in use (10:30)
        5. All notification delivery failing with pool exhaustion errors (10:30)
        6. Alert fires: 100% notification delivery failure (10:45)
        7. War room established, incident declared (10:45)
        8. Attempted graceful rollback - failed due to stuck connections (11:00)
        9. Emergency: Force-kill all notification service pods (11:15)
        10. Connections finally released when pods terminated (11:20)
        11. Rollback to v3.7.3 initiated (11:25)
        12. v3.7.3 deployed, service recovering (11:30 - MITIGATED)

**Full Resolution (11:30 - 14:00):**
        1. Service recovering, but message queue backlog exists (11:30)
        2. Kafka consumer lag at 50,000 messages (11:45)
        3. Scaled up notification worker pods to handle backlog (12:00)
        4. Database connection pool monitoring added to dashboard (12:15)
        5. Consumer lag decreasing as backlog processes (12:30)
        6. All pending notifications delivered (13:30)
        7. Queue backlog cleared, service fully operational (14:00 - RESOLVED)

**Post-Incident (14:00 - 16:30):**
        1. Root cause analysis: connection leak in v3.8.0 message consumer (14:15)
        2. Fixed the connection leak in the code (14:30)
        3. Identified the gap: staging load testing insufficient (14:45)
        4. Added connection pool monitoring to all services (15:00)
        5. Documented new load testing requirements (15:30)
        6. Incident closed after full review (16:30)`
      ]
    );
    
    const incident9Id = incident9Result.rows[0].id;
    console.log('Created Incident 9:', incident9Result.rows[0].incident_number);

    // Timeline events for Incident 9
    const incident9Timeline = [
      { type: 'detected', desc: 'Notification Service v3.8.0 deployment to production begins. All tests passed in staging.', user: 'henry.moore@company.com', time: '2025-02-12T10:15:00Z' },
      { type: 'action', desc: 'New version at 10% traffic. Monitoring metrics closely.', user: 'henry.moore@company.com', time: '2025-02-12T10:20:00Z' },
      { type: 'investigation', desc: 'Database connection pool utilization growing faster than expected - at 60% after 10 minutes.', user: 'frank.miller@company.com', time: '2025-02-12T10:25:00Z' },
      { type: 'detected', desc: 'CRITICAL: Database connection pool exhausted - 200/200 connections in use. All notification delivery failing.', user: 'frank.miller@company.com', time: '2025-02-12T10:30:00Z' },
      { type: 'investigation', desc: 'Alert fires: 100% notification delivery failure rate. War room established.', user: 'frank.miller@company.com', time: '2025-02-12T10:45:00Z' },
      { type: 'action', desc: 'Attempting graceful rollback to v3.7.3. Failed - stuck connections preventing clean shutdown.', user: 'frank.miller@company.com', time: '2025-02-12T11:00:00Z' },
      { type: 'action', desc: 'Emergency decision: Force-kill all notification service pods to release stuck connections.', user: 'frank.miller@company.com', time: '2025-02-12T11:15:00Z' },
      { type: 'action', desc: 'Connections released after pod termination. Initiating clean rollback.', user: 'frank.miller@company.com', time: '2025-02-12T11:20:00Z' },
      { type: 'action', desc: 'Rolling back to v3.7.3. Applying previous known-good version.', user: 'henry.moore@company.com', time: '2025-02-12T11:25:00Z' },
      { type: 'action', desc: 'v3.7.3 deployed. Service recovering, monitoring connection pool.', user: 'henry.moore@company.com', time: '2025-02-12T11:30:00Z' },
      { type: 'mitigated', desc: 'Notification service recovered. Connection pool stable. Error rate dropping.', user: 'frank.miller@company.com', time: '2025-02-12T11:30:00Z' },
      { type: 'investigation', desc: 'Message queue backlog at 50,000 messages. Scaling workers to process pending notifications.', user: 'henry.moore@company.com', time: '2025-02-12T11:45:00Z' },
      { type: 'action', desc: 'Scaled up notification worker pods from 10 to 30 to handle backlog.', user: 'henry.moore@company.com', time: '2025-02-12T12:00:00Z' },
      { type: 'action', desc: 'Added real-time connection pool monitoring to service dashboard.', user: 'frank.miller@company.com', time: '2025-02-12T12:15:00Z' },
      { type: 'action', desc: 'Consumer lag decreasing as backlog processes. Service returning to normal.', user: 'henry.moore@company.com', time: '2025-02-12T12:30:00Z' },
      { type: 'action', desc: 'All pending notifications delivered. Queue backlog cleared.', user: 'henry.moore@company.com', time: '2025-02-12T13:30:00Z' },
      { type: 'resolved', desc: 'All systems verified operational. Database connections stable. Incident resolved.', user: 'frank.miller@company.com', time: '2025-02-12T14:00:00Z' },
      { type: 'investigation', desc: 'Post-incident analysis: Connection leak in v3.8.0 message consumer - connections not closed on error path.', user: 'frank.miller@company.com', time: '2025-02-12T14:15:00Z' },
      { type: 'action', desc: 'Fixed connection leak in code - added proper connection cleanup in error handler.', user: 'frank.miller@company.com', time: '2025-02-12T14:30:00Z' },
    ];

    for (const event of incident9Timeline) {
      await pool.query(
        `INSERT INTO timeline_events (incident_id, event_type, description, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [incident9Id, event.type, event.desc, userIds[event.user], event.time]
      );
    }

    // Action items for Incident 9
    const incident9Actions = [
      { desc: 'Implement production-volume load testing in dedicated environment', user: 'henry.moore@company.com', completed: false },
      { desc: 'Extend load test duration to minimum 30 minutes to catch connection leaks', user: 'frank.miller@company.com', completed: true },
      { desc: 'Add connection pool utilization monitoring during all load tests', user: 'frank.miller@company.com', completed: true },
      { desc: 'Implement mandatory canary deployment for all releases (10% → 50% → 100%)', user: 'henry.moore@company.com', completed: true },
      { desc: 'Add connection leak detection to CI/CD pipeline static analysis', user: 'frank.miller@company.com', completed: false },
      { desc: 'Create production-like staging environment with proper resource allocation', user: 'alice.johnson@company.com', completed: false },
      { desc: 'Document connection management best practices for all services', user: 'frank.miller@company.com', completed: true },
      { desc: 'Add connection pool exhaustion alerts to production monitoring', user: 'frank.miller@company.com', completed: true },
    ];

    for (const action of incident9Actions) {
      await pool.query(
        `INSERT INTO action_items (incident_id, description, assigned_to_id, completed)
         VALUES ($1, $2, $3, $4)`,
        [incident9Id, action.desc, userIds[action.user], action.completed]
      );
    }

    // Link services to Incident 9
    const incident9Services = ['Notification Service', 'Email Service'];
    for (const serviceName of incident9Services) {
      await pool.query(
        `INSERT INTO incident_services (incident_id, runbook_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [incident9Id, runbookIds[serviceName]]
      );
    }

    console.log('Created Incident 9 with timeline and action items');

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
