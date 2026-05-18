const axios = require('axios');
const { spawn } = require('child_process');

const submitWithAxios = async (fullPayload) => {
  console.log('[Proxy] Attempting form submission via Axios...');
  const response = await axios.post('https://api.web3forms.com/submit', fullPayload, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    },
    timeout: 10000
  });
  return response.data;
};

const submitWithCurl = (fullPayload) => {
  return new Promise((resolve, reject) => {
    console.log('[Proxy] Falling back to form submission via Curl...');
    const curl = spawn('curl', [
      '-s',
      '-X', 'POST',
      '-H', 'Content-Type: application/json',
      '-H', 'Accept: application/json',
      '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      '-d', '@-',
      'https://api.web3forms.com/submit'
    ]);

    let stdoutData = '';
    let stderrData = '';

    curl.stdout.on('data', (chunk) => { stdoutData += chunk.toString(); });
    curl.stderr.on('data', (chunk) => { stderrData += chunk.toString(); });

    curl.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Curl exited with code ${code}. Stderr: ${stderrData}`));
      }
      try {
        const parsed = JSON.parse(stdoutData);
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse curl response: ${stdoutData.substring(0, 200)}`));
      }
    });

    curl.on('error', (err) => {
      reject(new Error(`Failed to spawn curl: ${err.message}`));
    });

    curl.stdin.write(JSON.stringify(fullPayload));
    curl.stdin.end();
  });
};

const submitToWeb3Forms = async (payload, res) => {
  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) {
    console.error('[Proxy Error] WEB3FORMS_ACCESS_KEY is not defined in server environment variables.');
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: Web3Forms Access Key is missing.'
    });
  }

  const fullPayload = {
    access_key: accessKey,
    ...payload
  };

  console.log(`[Proxy] Forwarding form submission for: ${payload.email || 'unknown email'}`);

  try {
    const result = await submitWithAxios(fullPayload);

    if (result && result.success) {
      console.log(`[Proxy] Axios submission successful for ${payload.email}`);
      return res.status(200).json(result);
    } else {
      console.warn('[Proxy Warning] Axios returned success=false. Trying Curl fallback...', result);
      throw new Error(result.message || 'Axios returned success=false');
    }
  } catch (axiosError) {
    console.error(`[Proxy] Axios attempt failed: ${axiosError.message}. Trying Curl fallback...`);

    try {
      const result = await submitWithCurl(fullPayload);
      if (result && result.success) {
        console.log(`[Proxy] Curl fallback submission successful for ${payload.email}`);
        return res.status(200).json(result);
      } else {
        console.error('[Proxy Error] Curl fallback returned success=false:', result);
        return res.status(400).json(result || { success: false, message: 'Web3Forms submission failed.' });
      }
    } catch (curlError) {
      console.error(`[Proxy Error] Curl fallback also failed: ${curlError.message}`);

      const errorMsg = axiosError.message || curlError.message || '';
      if (errorMsg.includes('403') || errorMsg.includes('cloudflare') || errorMsg.includes('Just a moment')) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Request was blocked by Web3Forms bot protection. Please contact support.'
        });
      }

      return res.status(502).json({
        success: false,
        message: 'Bad Gateway: Both Axios and Curl proxy attempts to Web3Forms failed.',
        error: errorMsg
      });
    }
  }
};


exports.handleContactSubmit = async (req, res) => {
  const { name, email, service, message, botcheck, subject, from_name } = req.body;

  if (botcheck) {
    console.warn(`[Security Alert] Bot submission blocked for email: ${email}`);
    return res.status(400).json({ success: false, message: 'Bot submission detected and blocked.' });
  }

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error: Name, email, and message are required fields.'
    });
  }

  const payload = {
    name,
    email,
    message,
    subject: subject || `New Inquiry from ${name} - Lue Infoservices`,
    from_name: from_name || "Lue Infoservices Website",
    service: service || 'Not Specified',
    custom_service: req.body.custom_service || '',
    company: req.body.company || ''
  };

  await submitToWeb3Forms(payload, res);
};



exports.handleHireSubmit = async (req, res) => {
  const { name, email, selectedTech, message, botcheck, subject, from_name, technology } = req.body;

  if (botcheck) {
    console.warn(`[Security Alert] Bot submission blocked for email: ${email}`);
    return res.status(400).json({ success: false, message: 'Bot submission detected and blocked.' });
  }

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error: Name, email, and message are required fields.'
    });
  }

  const payload = {
    name,
    email,
    message,
    subject: subject || `Hire Talent Inquiry: ${technology || selectedTech || 'Talent'} - Lue Infoservices`,
    from_name: from_name || "Lue Infoservices - Hire Talent",
    technology: technology || selectedTech || 'Not Specified',
    company: req.body.company || ''
  };

  await submitToWeb3Forms(payload, res);
};


exports.handleChatbotSubmit = async (req, res) => {
  const { name, email, message, subject, from_name } = req.body;

  if (!email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error: Email and message are required for chatbot submission.'
    });
  }

  const payload = {
    name: name || "Website Visitor",
    email,
    message,
    subject: subject || `New Lead: ${name || "Customer"} - Chatbot Inquiry`,
    from_name: from_name || "Lue Assistant Bot"
  };

  await submitToWeb3Forms(payload, res);
};
