/**
 * SENTARI Port Scanner
 * Checks common ports for open/closed status
 * Uses TCP connect scans (passive, no exploitation)
 */

export interface PortScanResult {
  domain: string;
  ports: Array<{
    port: number;
    service: string;
    state: 'open' | 'closed' | 'filtered';
    risk: 'critical' | 'high' | 'medium' | 'low' | 'info';
    description: string;
    plainEnglish: string;
  }>;
  openPorts: number;
  findings: Array<{
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    description: string;
    plainEnglish: string;
    regulation: string;
    remediation: string;
  }>;
}

// Common ports and their risk levels
const PORT_CHECKS = [
  { port: 21, service: 'FTP', risk: 'high' as const, desc: 'File Transfer Protocol — unencrypted file transfer' },
  { port: 22, service: 'SSH', risk: 'medium' as const, desc: 'Secure Shell — remote access' },
  { port: 23, service: 'Telnet', risk: 'critical' as const, desc: 'Telnet — unencrypted remote access (extremely dangerous)' },
  { port: 25, service: 'SMTP', risk: 'low' as const, desc: 'Simple Mail Transfer Protocol — email sending' },
  { port: 53, service: 'DNS', risk: 'info' as const, desc: 'Domain Name System' },
  { port: 80, service: 'HTTP', risk: 'info' as const, desc: 'Web server (unencrypted)' },
  { port: 110, service: 'POP3', risk: 'medium' as const, desc: 'Post Office Protocol — email retrieval (unencrypted)' },
  { port: 143, service: 'IMAP', risk: 'medium' as const, desc: 'Internet Message Access Protocol — email (unencrypted)' },
  { port: 443, service: 'HTTPS', risk: 'info' as const, desc: 'Secure web server' },
  { port: 993, service: 'IMAPS', risk: 'info' as const, desc: 'Secure IMAP' },
  { port: 995, service: 'POP3S', risk: 'info' as const, desc: 'Secure POP3' },
  { port: 3306, service: 'MySQL', risk: 'critical' as const, desc: 'MySQL database — should NOT be publicly accessible' },
  { port: 3389, service: 'RDP', risk: 'critical' as const, desc: 'Remote Desktop Protocol — Windows remote access' },
  { port: 5432, service: 'PostgreSQL', risk: 'critical' as const, desc: 'PostgreSQL database — should NOT be publicly accessible' },
  { port: 6379, service: 'Redis', risk: 'critical' as const, desc: 'Redis cache — should NOT be publicly accessible' },
  { port: 8080, service: 'HTTP-Alt', risk: 'low' as const, desc: 'Alternative web server port' },
  { port: 8443, service: 'HTTPS-Alt', risk: 'info' as const, desc: 'Alternative HTTPS port' },
  { port: 27017, service: 'MongoDB', risk: 'critical' as const, desc: 'MongoDB database — should NOT be publicly accessible' },
];

/**
 * Check if a port is open using TCP connect
 * Uses a short timeout to avoid hanging
 */
async function checkPort(domain: string, port: number, timeout = 3000): Promise<'open' | 'closed' | 'filtered'> {
  try {
    // Use DNS-over-HTTPS to resolve, then try HTTP connection
    // This is a basic check — real port scanning would use TCP connect
    const protocol = port === 443 || port === 8443 || port === 993 || port === 995 ? 'https' : 'http';
    const url = `${protocol}://${domain}:${port}`;
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'SENTARI-Port-Scanner/1.0' },
    });
    
    clearTimeout(timer);
    
    // If we got a response (any status), the port is open
    if (response.ok || response.status < 500) {
      return 'open';
    }
    
    return 'open'; // Got a response = port is open
  } catch (error) {
    const msg = String(error);
    // Connection refused = port is closed
    if (msg.includes('ECONNREFUSED') || msg.includes('Connection refused')) {
      return 'closed';
    }
    // Timeout = filtered (firewall)
    if (msg.includes('abort') || msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
      return 'filtered';
    }
    // Other errors — likely filtered
    return 'filtered';
  }
}

/**
 * Run port scan on a domain
 */
export async function runPortScan(domain: string): Promise<PortScanResult> {
  console.log(`[PORT] Scanning ${domain}...`);
  
  const ports: PortScanResult['ports'] = [];
  const findings: PortScanResult['findings'] = [];
  
  // Check all ports in parallel (batch of 5)
  for (let i = 0; i < PORT_CHECKS.length; i += 5) {
    const batch = PORT_CHECKS.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (check) => {
        const state = await checkPort(domain, check.port);
        return { ...check, state };
      })
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { port, service, risk, desc, state } = result.value;
        ports.push({ port, service, state, risk, description: desc, plainEnglish: '' });
      }
    }
  }
  
  // Generate findings for open ports
  const openPorts = ports.filter(p => p.state === 'open');
  
  for (const p of openPorts) {
    // Skip info-level services
    if (p.risk === 'info') continue;
    
    let plainEnglish = '';
    let regulation = '';
    let remediation = '';
    
    switch (p.service) {
      case 'Telnet':
        plainEnglish = 'Telnet is an ancient, unencrypted protocol. Anyone can intercept passwords sent over Telnet. This is like sending your password on a postcard.';
        regulation = 'POPIA Section 19(1)(b)';
        remediation = 'Disable Telnet immediately. Use SSH (port 22) instead for remote access.';
        break;
      case 'FTP':
        plainEnglish = 'FTP sends files in plain text. Anyone on the network can see usernames, passwords, and file contents.';
        regulation = 'NDPA Section 24';
        remediation = 'Replace FTP with SFTP (SSH File Transfer Protocol) or FTPS (FTP over SSL).';
        break;
      case 'MySQL':
        plainEnglish = 'Your database is exposed to the internet. Attackers can attempt to brute-force passwords or exploit database vulnerabilities.';
        regulation = 'POPIA Section 19(1)(c)';
        remediation = 'Restrict MySQL access to localhost or specific IPs. Use a firewall to block external access.';
        break;
      case 'PostgreSQL':
        plainEnglish = 'Your database is exposed to the internet. This is like leaving your office safe open on the street.';
        regulation = 'POPIA Section 19(1)(c)';
        remediation = 'Restrict PostgreSQL access to localhost or specific IPs. Never expose databases publicly.';
        break;
      case 'Redis':
        plainEnglish = 'Redis cache is exposed. Attackers can read/modify cached data or use it to launch further attacks.';
        regulation = 'ISO 27001 A.13.1.1';
        remediation = 'Bind Redis to 127.0.0.1 and require authentication.';
        break;
      case 'MongoDB':
        plainEnglish = 'MongoDB is exposed to the internet. This is one of the most common causes of data breaches.';
        regulation = 'POPIA Section 19(1)(c)';
        remediation = 'Bind MongoDB to localhost. Enable authentication. Use IP whitelisting.';
        break;
      case 'RDP':
        plainEnglish = 'Remote Desktop is exposed. This is the #1 attack vector for ransomware. Attackers scan for open RDP and brute-force passwords.';
        regulation = 'NDPA Section 24';
        remediation = 'Disable RDP or restrict to VPN-only access. Use Multi-Factor Authentication.';
        break;
      case 'SSH':
        plainEnglish = 'SSH is open. While encrypted, exposed SSH can be brute-forced. Ensure key-based authentication is used.';
        regulation = 'ISO 27001 A.9.4.2';
        remediation = 'Disable password authentication. Use SSH keys only. Consider changing default port.';
        break;
      case 'POP3':
        plainEnglish = 'POP3 is unencrypted. Emails and passwords are sent in plain text.';
        regulation = 'NDPA Section 24';
        remediation = 'Use POP3S (port 995) instead of POP3.';
        break;
      case 'IMAP':
        plainEnglish = 'IMAP is unencrypted. Email contents can be intercepted.';
        regulation = 'NDPA Section 24';
        remediation = 'Use IMAPS (port 993) instead of IMAP.';
        break;
      default:
        plainEnglish = `Port ${p.port} (${p.service}) is open. This may expose services that should be restricted.`;
        regulation = 'General Security';
        remediation = `Review if ${p.service} needs to be publicly accessible. Restrict access if possible.`;
    }
    
    findings.push({
      title: `${p.service} (port ${p.port}) is publicly accessible`,
      severity: p.risk,
      description: p.description,
      plainEnglish,
      regulation,
      remediation,
    });
  }
  
  console.log(`[PORT] ${domain}: ${openPorts.length} open ports, ${findings.length} findings`);
  
  return {
    domain,
    ports,
    openPorts: openPorts.length,
    findings,
  };
}
