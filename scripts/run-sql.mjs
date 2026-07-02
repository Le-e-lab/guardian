import tls from 'tls';
import net from 'net';
import crypto from 'crypto';

const PROJECT_REF = 'szlfywgscnowxnhohpac';
const PASSWORD = 'hiStLXKNfOGmMOXh';
const SQL_FILE = process.argv[2];

import fs from 'fs';
const sql = fs.readFileSync(SQL_FILE, 'utf8');

const socket = net.createConnection({ host: 'aws-0-eu-central-2.pooler.supabase.com', port: 6543 }, () => {
  const tlsSocket = tls.connect({
    socket: socket,
    servername: `${PROJECT_REF}.pooler.supabase.com`,
    rejectUnauthorized: false,
  }, () => {
    console.log('TLS connected with SNI!');

    // Build PostgreSQL startup message (v3.0)
    const user = 'postgres';
    const database = 'postgres';
    let params = `user\x00${user}\x00database\x00${database}\x00\x00`;
    let len = 4 + 4 + params.length;
    let buf = Buffer.alloc(len);
    buf.writeInt32BE(len, 0);
    buf.writeInt32BE(196608, 4); // version 3.0
    buf.write(params, 8);
    tlsSocket.write(buf);
  });

  let authComplete = false;
  let dataBuf = Buffer.alloc(0);

  tlsSocket.on('data', (chunk) => {
    dataBuf = Buffer.concat([dataBuf, chunk]);

    while (dataBuf.length > 4) {
      const msgLen = dataBuf.readInt32BE(0);
      if (dataBuf.length < msgLen) break; // Wait for more data

      const msgType = String.fromCharCode(dataBuf[4]);
      const body = dataBuf.slice(5, msgLen);
      dataBuf = dataBuf.slice(msgLen);

      if (msgType === 'R') {
        const authType = body.readInt32BE(0);
        if (authType === 0) {
          console.log('Authentication OK!');
          authComplete = true;
        } else if (authType === 3) {
          // Cleartext password
          let pwdMsg = `password\x00${PASSWORD}\x00`;
          let pwdBuf = Buffer.alloc(4 + pwdMsg.length);
          pwdBuf.writeInt32BE(4 + pwdMsg.length, 0);
          pwdBuf.write(pwdMsg, 4);
          tlsSocket.write(pwdBuf);
        } else if (authType === 5) {
          // MD5 password
          const salt = body.slice(1, 5);
          const hash = crypto.createHash('md5')
            .update('md5' + crypto.createHash('md5').update(PASSWORD + 'postgres').digest('hex') + salt.toString('hex'))
            .digest('hex');
          let pwdMsg = `password\x00md5${hash}\x00`;
          let pwdBuf = Buffer.alloc(4 + pwdMsg.length);
          pwdBuf.writeInt32BE(4 + pwdMsg.length, 0);
          pwdBuf.write(pwdMsg, 4);
          tlsSocket.write(pwdBuf);
        } else {
          console.log('Unknown auth type:', authType);
        }
      } else if (msgType === 'S') {
        // ParameterStatus - skip
      } else if (msgType === 'K') {
        // BackendKeyData - skip
      } else if (msgType === 'Z') {
        // ReadyForQuery
        if (!authComplete) {
          console.log('ERROR: Not authenticated');
          process.exit(1);
        }
        console.log('Ready for query! Sending SQL...');

        // Split SQL into individual statements and execute
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        let i = 0;
        function runNext() {
          if (i >= statements.length) {
            console.log(`\nAll ${statements.length} statements executed successfully!`);
            // Send Terminate
            const termBuf = Buffer.alloc(5);
            termBuf.writeInt32BE(5, 0);
            termBuf.write('X', 4);
            tlsSocket.write(termBuf);
            setTimeout(() => process.exit(0), 500);
            return;
          }

          const stmt = statements[i];
          const truncated = stmt.substring(0, 80).replace(/\n/g, ' ');
          process.stdout.write(`[${i + 1}/${statements.length}] ${truncated}... `);

          const query = stmt + '\x00';
          let qBuf = Buffer.alloc(4 + 4 + query.length);
          qBuf.writeInt32BE(4 + 4 + query.length, 0);
          qBuf.write('Q', 4);
          qBuf.write(query, 5);
          tlsSocket.write(qBuf);

          // Wait for ReadyForQuery before next statement
          let waitingForReady = true;
          const oldHandler = tlsSocket.listenerCount('data') > 0 ? null : null;

          function onResultData(chunk) {
            // Just consume until we see 'Z' (ReadyForQuery)
            dataBuf = Buffer.concat([dataBuf, chunk]);
            while (dataBuf.length > 4) {
              const mLen = dataBuf.readInt32BE(0);
              if (dataBuf.length < mLen) break;
              const mType = String.fromCharCode(dataBuf[4]);
              dataBuf = dataBuf.slice(mLen);

              if (mType === 'Z') {
                tlsSocket.removeListener('data', onResultData);
                console.log('OK');
                i++;
                runNext();
                return;
              }
              if (mType === 'E') {
                // Error - print it
                const errBody = dataBuf.slice(0, dataBuf.length);
                // Find the 'S' field (severity)
                let severity = '';
                let message = '';
                for (let j = 0; j < errBody.length; j++) {
                  if (errBody[j] === 0x53) { // 'S'
                    severity = errBody.slice(j + 1, errBody.indexOf(0, j + 1)).toString();
                  }
                  if (errBody[j] === 0x4d) { // 'M'
                    message = errBody.slice(j + 1, errBody.indexOf(0, j + 1)).toString();
                  }
                }
                if (message) console.log(`\n  WARNING: ${message}`);
              }
            }
          }

          tlsSocket.on('data', onResultData);
        }

        runNext();
      } else if (msgType === 'E') {
        // Error response
        console.log('Error:', body.toString());
      }
    }
  });

  tlsSocket.on('error', (e) => {
    console.log('TLS Error:', e.message);
    process.exit(1);
  });

  socket.on('error', (e) => {
    console.log('Socket Error:', e.message);
    process.exit(1);
  });

  setTimeout(() => {
    console.log('Timeout!');
    process.exit(1);
  }, 60000);
});
