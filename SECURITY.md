# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in this project, please report it by emailing the maintainers. **Do NOT create a public GitHub issue.**

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Security Best Practices

### Backend Security

1. **Environment Variables**
   - NEVER commit `.env` files to version control
   - Always use `.env.example` as template
   - Rotate API keys if accidentally exposed
   - Use strong, random values for `APP_SECRET_KEY`

2. **API Security**
   - All API endpoints require `X-App-Key` header
   - CORS is restricted to allowed origins (configure `ALLOWED_ORIGINS`)
   - Rate limiting is enabled (100 req/15min for API, 5 req/min for AI)
   - Request logging with unique IDs for tracing

3. **Database Security**
   - Use connection pooling with timeouts
   - Parameterized queries via Prisma (SQL injection protection)
   - Soft delete for data retention
   - Row-level security via Supabase policies

4. **Input Validation**
   - Zod schemas for all API inputs
   - File upload size limits (5MB for images)
   - Base64 payload size limits (10MB for AI)
   - Enum validation for payment methods/status

### Mobile Security

1. **API Keys**
   - Do NOT hardcode APP_KEY in `app.json`
   - Use environment-specific configuration
   - Rotate keys if app is decompiled

2. **Network Security**
   - Always use HTTPS in production
   - Implement certificate pinning for extra security
   - Validate SSL certificates

### Deployment Security

1. **Production Checklist**
   - [ ] Set `NODE_ENV=production`
   - [ ] Configure `ALLOWED_ORIGINS` with production domains
   - [ ] Rotate all development API keys
   - [ ] Enable HTTPS only
   - [ ] Configure Helmet security headers
   - [ ] Set up monitoring and alerting
   - [ ] Regular security updates

2. **Key Rotation Schedule**
   - `APP_SECRET_KEY`: Every 6 months or on suspected compromise
   - `SUPABASE_SERVICE_ROLE_KEY`: Every 12 months
   - `GEMINI_API_KEY`: As needed

## Known Security Considerations

### Sensitive Data Storage
- Database passwords and API keys are stored in environment variables
- Ensure production environment has restricted access
- Use secret management services in production (AWS Secrets Manager, etc.)

### Rate Limiting
- Current rate limiting is in-memory (resets on server restart)
- For production, consider Redis-based rate limiting for multi-instance deployments

### Authentication
- Current system uses shared secret (`APP_SECRET_KEY`)
- Consider implementing user-based authentication (JWT) for user-specific operations
- Add role-based access control (RBAC) if multiple user types needed

## Security Headers

The following security headers are configured via Helmet:

- `Content-Security-Policy`: Restricts resource loading
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `Strict-Transport-Security`: Enforces HTTPS
- `X-XSS-Protection`: Enables XSS filtering

## Dependency Security

1. **Regular Updates**
   - Run `npm audit` regularly
   - Update dependencies with security patches
   - Review breaking changes before major updates

2. **Supply Chain Security**
   - Use `package-lock.json` for reproducible builds
   - Verify package integrity
   - Avoid packages with known vulnerabilities

## Incident Response

If a security breach occurs:

1. **Immediate Actions**
   - Rotate all API keys and secrets
   - Review access logs for unauthorized access
   - Assess data exposure
   - Notify affected users if applicable

2. **Investigation**
   - Determine attack vector
   - Identify compromised data
   - Document timeline

3. **Remediation**
   - Apply security patches
   - Implement additional controls
   - Update security policies
   - Conduct post-mortem

## Contact

For security concerns, contact: [your-security-email@example.com]

## Changelog

- 2026-06-02: Initial security documentation
  - Added CORS restrictions
  - Implemented rate limiting
  - Enhanced health checks
  - Improved input validation
