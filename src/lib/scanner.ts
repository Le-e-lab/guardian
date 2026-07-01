/**
 * SENTARI Scanning Engine
 * Passive reconnaissance pipeline using open-source tools
 */

import { runCredentialCheck } from './credentials';
import { runSocialOSINT } from './social-osint';
import { checkThreatIntel, getAfricanThreatIntel, monitorSecurityForums } from './threat-intel';

export interface ScanConfig {
  target: string;
  mode: 'passive' | 'active';
  modules: string[];
}

export interface ReconResult {
  tool: string;
  status: 'success' | 'error' | 'skipped';
  output: Record<string, unknown>;
  findings: Finding[];
  duration_ms: number;
}

export interface Finding {
  title: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  category: string;
  evidence: Record<string, unknown>;
  remediation: string;
}

/**
 * Main scan orchestrator - runs all modules in parallel for speed
 */
export async function runScan(config: ScanConfig): Promise<ReconResult[]> {
  const startTime = Date.now();
  console.log(`[SENTARI] Starting scan: ${config.target} (${config.mode} mode)`);

  // Build list of scan promises
  const scanPromises: Promise<ReconResult>[] = [];

  if (config.modules.includes('dns')) {
    scanPromises.push(scanDns(config.target));
  }
  if (config.modules.includes('ports')) {
    scanPromises.push(scanPorts(config.target));
  }
  if (config.modules.includes('tech')) {
    scanPromises.push(scanTechnology(config.target));
  }
  if (config.modules.includes('ssl')) {
    scanPromises.push(scanSsl(config.target));
  }
  if (config.modules.includes('headers')) {
    scanPromises.push(scanHeaders(config.target));
  }
  if (config.modules.includes('subdomains')) {
    scanPromises.push(scanSubdomains(config.target));
  }

  // Credential leak check
  if (config.modules.includes('credentials')) {
    scanPromises.push(
      runCredentialCheck(config.target).then(findings => ({
        tool: 'credential-check',
        status: 'success' as const,
        output: { domain: config.target, findingsCount: findings.length },
        findings,
        duration_ms: 0,
      }))
    );
  }

  // Social media OSINT
  if (config.modules.includes('social')) {
    scanPromises.push(
      runSocialOSINT(config.target).then(findings => ({
        tool: 'social-osint',
        status: 'success' as const,
        output: { domain: config.target, findingsCount: findings.length },
        findings,
        duration_ms: 0,
      }))
    );
  }

  // Threat intelligence feed
  if (config.modules.includes('threat_intel')) {
    scanPromises.push(
      checkThreatIntel(config.target).then(findings => ({
        tool: 'threat-intel',
        status: 'success' as const,
        output: { domain: config.target, findingsCount: findings.length },
        findings,
        duration_ms: 0,
      }))
    );
  }

  // African-specific threat intel
  if (config.modules.includes('african_threat')) {
    scanPromises.push(
      getAfricanThreatIntel().then(findings => ({
        tool: 'african-threat-intel',
        status: 'success' as const,
        output: { findingsCount: findings.length },
        findings,
        duration_ms: 0,
      }))
    );
  }

  // Security forum monitoring
  if (config.modules.includes('forum_osint')) {
    scanPromises.push(
      monitorSecurityForums(config.target).then(findings => ({
        tool: 'forum-osint',
        status: 'success' as const,
        output: { domain: config.target, findingsCount: findings.length },
        findings,
        duration_ms: 0,
      }))
    );
  }

  // Run all scans in parallel with individual timeouts
  const results = await Promise.allSettled(
    scanPromises.map(p => 
      Promise.race([
        p.catch(err => ({
          tool: 'unknown',
          status: 'error' as const,
          output: { error: String(err) },
          findings: [],
          duration_ms: 0,
        })),
        new Promise<ReconResult>((_, reject) => 
          setTimeout(() => reject(new Error('Scan timeout')), 25000)
        )
      ]).catch(err => ({
        tool: 'unknown',
        status: 'error' as const,
        output: { error: String(err) },
        findings: [],
        duration_ms: 0,
      }))
    )
  );

  // Extract successful results
  const scanResults: ReconResult[] = results
    .filter((r): r is PromiseFulfilledResult<ReconResult> => r.status === 'fulfilled')
    .map(r => r.value);

  console.log(`[SENTARI] Scan completed in ${Date.now() - startTime}ms (${scanResults.length} modules)`);
  return scanResults;
}

/**
 * DNS enumeration - basic domain info
 */
async function scanDns(target: string): Promise<ReconResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  try {
    // DNS lookup via public API
    const response = await fetch(
      `https://dns.google/resolve?name=${target}&type=A`
    );
    const data = await response.json();

    const ips = data.Answer?.filter((r: { type: number }) => r.type === 1)
      .map((r: { data: string }) => r.data) || [];

    // Check for common misconfigurations
    if (ips.length === 0) {
      findings.push({
        title: 'No A records found',
        severity: 'info',
        category: 'dns',
        evidence: { domain: target, records: data },
        remediation: 'Verify DNS configuration',
      });
    }

    return {
      tool: 'dns-lookup',
      status: 'success',
      output: { domain: target, ips, records: data.Answer || [] },
      findings,
      duration_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      tool: 'dns-lookup',
      status: 'error',
      output: { error: String(error) },
      findings: [],
      duration_ms: Date.now() - start,
    };
  }
}

/**
 * Port scanning - check common ports
 */
async function scanPorts(target: string): Promise<ReconResult> {
  const start = Date.now();
  const findings: Finding[] = [];
  const openPorts: Array<{ port: number; service: string; state: string }> = [];

  // Critical ports to check (top 10 only for speed)
  const portsToCheck = [
    { port: 21, service: 'FTP' },
    { port: 22, service: 'SSH' },
    { port: 23, service: 'Telnet' },
    { port: 80, service: 'HTTP' },
    { port: 443, service: 'HTTPS' },
    { port: 3306, service: 'MySQL' },
    { port: 3389, service: 'RDP' },
    { port: 5432, service: 'PostgreSQL' },
    { port: 8080, service: 'HTTP-Proxy' },
    { port: 8443, service: 'HTTPS-Alt' },
  ];

  // Check ports via TCP connection attempts (parallel, fast timeout)
  for (const { port, service } of portsToCheck) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500); // 1.5s timeout per port

      const response = await fetch(`https://${target}:${port}`, {
        signal: controller.signal,
        method: 'HEAD',
      }).catch(() => null);

      clearTimeout(timeout);

      if (response && response.status < 500) {
        openPorts.push({ port, service, state: 'open' });

        // Flag dangerous ports
        if ([21, 23, 3389, 5900, 1433, 3306, 5432].includes(port)) {
          findings.push({
            title: `Potentially exposed service: ${service} (port ${port})`,
            severity: port === 23 ? 'high' : 'medium',
            category: 'exposed_service',
            evidence: { port, service, target },
            remediation: `Restrict access to port ${port} (${service}) via firewall. Use VPN or SSH tunneling for remote access.`,
          });
        }
      }
    } catch {
      // Port closed or filtered - normal
    }
  }

  return {
    tool: 'port-scan',
    status: 'success',
    output: { target, openPorts, portsChecked: portsToCheck.length },
    findings,
    duration_ms: Date.now() - start,
  };
}

/**
 * Technology detection - identify web technologies
 */
async function scanTechnology(target: string): Promise<ReconResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  try {
    const response = await fetch(`https://${target}`, {
      headers: { 'User-Agent': 'SENTARI-Security-Scanner/1.0' },
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const body = await response.text();

    // Detect technologies
    const techs: string[] = [];

    if (body.includes('WordPress') || headers['x-powered-by']?.includes('PHP')) {
      techs.push('WordPress/PHP');
    }
    if (body.includes('Drupal')) techs.push('Drupal');
    if (body.includes('Joomla')) techs.push('Joomla');
    if (headers['x-powered-by']?.includes('Express')) techs.push('Node.js/Express');
    if (headers['x-powered-by']?.includes('ASP.NET')) techs.push('ASP.NET');
    if (headers['server']?.includes('nginx')) techs.push('Nginx');
    if (headers['server']?.includes('Apache')) techs.push('Apache');
    if (body.includes('react') || body.includes('__NEXT_DATA__')) techs.push('React/Next.js');
    if (body.includes('vue') || body.includes('Vue.js')) techs.push('Vue.js');
    if (body.includes('angular') || body.includes('ng-app')) techs.push('Angular');

    // Check for version disclosure
    const serverHeader = headers['server'];
    if (serverHeader && /\d+\.\d+/.test(serverHeader)) {
      findings.push({
        title: `Server version disclosed: ${serverHeader}`,
        severity: 'low',
        category: 'information_disclosure',
        evidence: { header: 'server', value: serverHeader },
        remediation: 'Remove version information from server headers',
      });
    }

    return {
      tool: 'tech-detect',
      status: 'success',
      output: { target, technologies: techs, headers, statusCode: response.status },
      findings,
      duration_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      tool: 'tech-detect',
      status: 'error',
      output: { error: String(error) },
      findings: [],
      duration_ms: Date.now() - start,
    };
  }
}

/**
 * SSL/TLS certificate analysis
 */
async function scanSsl(target: string): Promise<ReconResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  try {
    // Use crt.sh for certificate transparency logs
    const response = await fetch(
      `https://crt.sh/?q=${target}&output=json`
    );
    const certs = await response.json();

    const uniqueCerts = certs.slice(0, 10); // Top 10 most recent

    // Check for expired certs
    const now = new Date();
    for (const cert of uniqueCerts) {
      if (cert.not_after && new Date(cert.not_after) < now) {
        findings.push({
          title: `Expired certificate found: ${cert.common_name}`,
          severity: 'medium',
          category: 'ssl_tls',
          evidence: { 
            name: cert.common_name, 
            expired: cert.not_after,
            issuer: cert.issuer_name 
          },
          remediation: 'Renew the SSL certificate and ensure auto-renewal is configured',
        });
      }
    }

    // Check for wildcard certs (potential risk)
    const wildcards = uniqueCerts.filter((c: { common_name: string }) => 
      c.common_name?.startsWith('*.')
    );
    if (wildcards.length > 0) {
      findings.push({
        title: 'Wildcard certificates detected',
        severity: 'info',
        category: 'ssl_tls',
        evidence: { wildcards: wildcards.map((w: { common_name: string }) => w.common_name) },
        remediation: 'Review wildcard certificate scope - ensure it only covers intended subdomains',
      });
    }

    return {
      tool: 'ssl-check',
      status: 'success',
      output: { target, certificates: uniqueCerts, totalFound: certs.length },
      findings,
      duration_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      tool: 'ssl-check',
      status: 'error',
      output: { error: String(error) },
      findings: [],
      duration_ms: Date.now() - start,
    };
  }
}

/**
 * HTTP security headers analysis
 */
async function scanHeaders(target: string): Promise<ReconResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  const securityHeaders = [
    { name: 'strict-transport-security', severity: 'high' as const, desc: 'HSTS not set' },
    { name: 'content-security-policy', severity: 'high' as const, desc: 'CSP not set' },
    { name: 'x-frame-options', severity: 'medium' as const, desc: 'X-Frame-Options not set (clickjacking risk)' },
    { name: 'x-content-type-options', severity: 'low' as const, desc: 'X-Content-Type-Options not set' },
    { name: 'x-xss-protection', severity: 'low' as const, desc: 'X-XSS-Protection not set' },
    { name: 'referrer-policy', severity: 'low' as const, desc: 'Referrer-Policy not set' },
  ];

  try {
    const response = await fetch(`https://${target}`, {
      headers: { 'User-Agent': 'SENTARI-Security-Scanner/1.0' },
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    for (const { name, severity, desc } of securityHeaders) {
      if (!headers[name]) {
        findings.push({
          title: desc,
          severity,
          category: 'security_headers',
          evidence: { header: name, present: false },
          remediation: `Add the ${name} header to your HTTP response`,
        });
      }
    }

    // Check for dangerous headers
    if (headers['access-control-allow-origin'] === '*') {
      findings.push({
        title: 'CORS wildcard origin detected',
        severity: 'medium',
        category: 'security_headers',
        evidence: { header: 'access-control-allow-origin', value: '*' },
        remediation: 'Restrict CORS to specific trusted origins',
      });
    }

    return {
      tool: 'header-check',
      status: 'success',
      output: { target, headers, securityHeadersPresent: securityHeaders.filter(h => headers[h.name]).map(h => h.name) },
      findings,
      duration_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      tool: 'header-check',
      status: 'error',
      output: { error: String(error) },
      findings: [],
      duration_ms: Date.now() - start,
    };
  }
}

/**
 * Subdomain enumeration
 */
async function scanSubdomains(target: string): Promise<ReconResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  // Most common subdomains (reduced for speed)
  const commonSubs = [
    'www', 'mail', 'admin', 'api', 'dev', 'staging', 'test',
    'portal', 'login', 'app', 'dashboard', 'cdn', 'blog',
    'shop', 'pay', 'support', 'docs', 'vpn', 'webmail',
  ];

  const discovered: Array<{ subdomain: string; ip: string | null }> = [];

  // Check subdomains via DNS
  for (const sub of commonSubs) {
    try {
      const response = await fetch(
        `https://dns.google/resolve?name=${sub}.${target}&type=A`
      );
      const data = await response.json();

      if (data.Answer && data.Answer.length > 0) {
        const ip = data.Answer.find((r: { type: number }) => r.type === 1)?.data;
        discovered.push({ subdomain: `${sub}.${target}`, ip: ip || null });

        // Flag risky subdomains
        if (['admin', 'staging', 'test', 'dev', 'jenkins', 'ci'].includes(sub)) {
          findings.push({
            title: `Potentially sensitive subdomain discovered: ${sub}.${target}`,
            severity: sub === 'admin' ? 'high' : 'medium',
            category: 'subdomain',
            evidence: { subdomain: `${sub}.${target}`, ip },
            remediation: `Restrict access to ${sub}.${target} - ensure it's not publicly accessible`,
          });
        }
      }
    } catch {
      // DNS lookup failed - subdomain doesn't exist
    }
  }

  return {
    tool: 'subdomain-enum',
    status: 'success',
    output: { target, discovered, totalChecked: commonSubs.length },
    findings,
    duration_ms: Date.now() - start,
  };
}
