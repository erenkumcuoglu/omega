const testCommand = async (cmd, params = {}) => {
  const username = 'eren@omegadijital.com';
  const password = 'ErenYamaha11#.';
  const baseUrl = 'https://www.turkpin.com/api.php';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<APIRequest>
  <params>
    <username>${username}</username>
    <password>${password}</password>
    <cmd>${cmd}</cmd>`;

  for (const [key, value] of Object.entries(params)) {
    xml += `\n    <${key}>${value}</${key}>`;
  }

  xml += `
  </params>
</APIRequest>`;

  const formData = new URLSearchParams();
  formData.append('DATA', xml);

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData
  });

  const text = await response.text();
  console.log(`=== ${cmd} ===`);
  console.log(text);
  console.log('');
};

(async () => {
  // Test product commands
  await testCommand('epinProducts', { epinId: '1' });
  await testCommand('getProducts', { categoryId: '1' });
  await testCommand('listProducts', { gameId: '1' });
  await testCommand('products', { category: '1' });
})()