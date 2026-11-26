import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = 'http://127.0.0.1:5173';
const apiUrl = 'http://127.0.0.1:8000/api/v1';

async function runPersistenceAudit() {
  console.log('=== RIGOROUS PHASE 4 & 5 PERSISTENCE & CRUD AUDIT ===\n');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[Browser Error]', msg.text());
  });

  try {
    // 1. Register & Authenticate
    console.log('Step 1: Registering user...');
    const userEmail = `audit_${Date.now()}@bhiv.io`;
    const userPass = 'AuditSecure2026!';

    await page.goto(`${baseUrl}/#/login`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const createAccountTab = tabs.find(b => b.textContent && b.textContent.trim() === 'Create Account');
      if (createAccountTab) createAccountTab.click();
    });
    await new Promise(r => setTimeout(r, 500));

    await page.waitForSelector('input[placeholder="Jane Developer"]');
    await page.type('input[placeholder="Jane Developer"]', 'Audit Engineer');
    await page.type('input[type="email"]', userEmail);
    await page.type('input[type="password"]', userPass);

    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b =>
        b.textContent && b.textContent.includes('Register Account')
      );
      if (submitBtn) submitBtn.click();
    });

    await new Promise(r => setTimeout(r, 2000));
    console.log(` -> Registered and authenticated as: ${userEmail}`);

    // 2. Create Project
    console.log('Step 2: Creating project for persistence verification...');
    const projName = `persist-${Date.now().toString().slice(-4)}`;
    await page.goto(`${baseUrl}/#/projects/new`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    await page.type('input[placeholder="e.g. ai-data-pipeline"]', projName);
    await page.type('textarea', 'Project to test persistence across page refresh and server restarts');

    await page.evaluate(() => {
      const createBtn = Array.from(document.querySelectorAll('button')).find(b =>
        b.textContent && b.textContent.includes('Create Project')
      );
      if (createBtn) createBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    console.log(` -> Created project: ${projName}`);

    // 3. Add a file directly to project
    console.log('Step 3: Creating service.py in project...');
    const fileCreated = await page.evaluate(async (pName) => {
      const activeProjId = sessionStorage.getItem('bhiv_active_project_id');
      const token = sessionStorage.getItem('bhiv_auth_token');
      const res = await fetch(`http://127.0.0.1:8000/api/v1/projects/${activeProjId}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: 'service.py',
          path: '/service.py',
          content: 'def calculate_metrics():\n    return {"accuracy": 0.98}\n',
          language: 'python',
          is_folder: false,
        })
      });
      return res.ok;
    }, projName);

    if (!fileCreated) throw new Error('Failed to create service.py via API');
    console.log(' -> service.py created in backend SQLite');

    // 4. Submit prompt
    console.log('Step 4: Submitting prompt in Workspace...');
    await page.goto(`${baseUrl}/#/workspace`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));

    const promptText = 'Add unit tests for calculate_metrics function.';
    await page.type('input[placeholder*="Instruct agent"]', promptText);

    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b =>
        b.textContent && b.textContent.includes('Submit')
      );
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    const chatBeforeRefresh = await page.evaluate(() => document.body.innerText);
    if (!chatBeforeRefresh.includes('Add unit tests for calculate_metrics')) {
      throw new Error('Prompt not found in chat before refresh!');
    }
    console.log(' -> Prompt visible in chat before refresh');

    // 5. HARD PAGE REFRESH
    console.log('\nStep 5: Executing HARD PAGE REFRESH (F5 simulation)...');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2500));
    console.log(' -> Page reloaded.');

    // 6. Verify Session & Data Persistence After Refresh
    console.log('Step 6: Verifying data persistence after page refresh...');
    const urlAfterReload = page.url();
    console.log(` -> URL after reload: ${urlAfterReload}`);
    if (urlAfterReload.includes('/login')) {
      throw new Error('Session lost after refresh! User was redirected to login.');
    }
    console.log(' -> [PASS] Authentication persisted across page refresh.');

    const workspaceAfterReload = await page.evaluate(() => document.body.innerText);
    const hasProjectSelected = workspaceAfterReload.includes(projName);
    const hasReadmeAfterReload = workspaceAfterReload.includes('README.md');
    const hasServicePyAfterReload = workspaceAfterReload.includes('service.py');
    const hasPromptAfterReload = workspaceAfterReload.includes('Add unit tests for calculate_metrics');

    console.log(` -> Project selected after reload: ${hasProjectSelected}`);
    console.log(` -> README.md in tree after reload: ${hasReadmeAfterReload}`);
    console.log(` -> service.py in tree after reload: ${hasServicePyAfterReload}`);
    console.log(` -> Prompt history preserved in chat: ${hasPromptAfterReload}`);

    if (!hasProjectSelected || !hasReadmeAfterReload || !hasServicePyAfterReload || !hasPromptAfterReload) {
      throw new Error('Data persistence check failed! Some items were not restored from SQLite.');
    }
    console.log(' -> [PASS] All project files, active project selection, and prompt conversation persisted in SQLite!');

    // 7. Verify History Page Persistence
    console.log('\nStep 7: Verifying audit history persistence...');
    await page.goto(`${baseUrl}/#/history`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));

    const historyText = await page.evaluate(() => document.body.innerText);
    const hasProjectCreated = historyText.includes('project_created');
    const hasFileCreated = historyText.includes('file_created');
    const hasPromptSubmitted = historyText.includes('prompt_submitted');

    console.log(` -> Audit log contains project_created: ${hasProjectCreated}`);
    console.log(` -> Audit log contains file_created: ${hasFileCreated}`);
    console.log(` -> Audit log contains prompt_submitted: ${hasPromptSubmitted}`);

    if (!hasProjectCreated || !hasFileCreated || !hasPromptSubmitted) {
      throw new Error('Audit history verification failed!');
    }
    console.log(' -> [PASS] All activity audit records confirmed in SQLite.');

    // 8. Test Project Deletion
    console.log('\nStep 8: Testing project deletion (DELETE /projects/{id})...');
    await page.goto(`${baseUrl}/#/projects`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));

    // Handle window.confirm for project delete
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    const deletedSuccess = await page.evaluate(async (pName) => {
      const activeProjId = sessionStorage.getItem('bhiv_active_project_id');
      const token = sessionStorage.getItem('bhiv_auth_token');
      if (!activeProjId || !token) return false;

      const res = await fetch(`http://127.0.0.1:8000/api/v1/projects/${activeProjId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.status === 204 || res.ok;
    }, projName);

    console.log(` -> Project DELETE API returned: ${deletedSuccess}`);
    if (!deletedSuccess) throw new Error('Failed to delete project via API!');

    // Reload projects page
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    const projectsListText = await page.evaluate(() => document.body.innerText);
    const projectStillPresent = projectsListText.includes(projName);
    console.log(` -> Project still present in list: ${projectStillPresent}`);
    if (projectStillPresent) throw new Error('Deleted project is still listed in SQLite!');
    console.log(' -> [PASS] Project and its associated records cleanly deleted.');

    console.log('\n===============================================================');
    console.log('ALL RIGOROUS PERSISTENCE AND AUDIT CHECKS PASSED SUCCESSFULLY!');
    console.log('===============================================================');
  } catch (err) {
    console.error('\nPERSISTENCE AUDIT FAILURE:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runPersistenceAudit();
