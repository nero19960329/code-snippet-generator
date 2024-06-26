const createBtn = document.getElementById('create-snippet-btn');
const snippetList = document.getElementById('snippet-list');
const snippetDetail = document.getElementById('snippet-detail');
const noSnippetSelected = document.getElementById('no-snippet-selected');
const snippetEditor = document.getElementById('snippet-editor');
const codeDescription = document.getElementById('code-description');
const generateCodeBtn = document.getElementById('generate-code-btn');
const generatedCode = document.getElementById('generated-code');
const codeFeedback = document.getElementById('code-feedback');
const improveCodeBtn = document.getElementById('improve-code-btn');
const generateTestsBtn = document.getElementById('generate-tests-btn');
const generatedTests = document.getElementById('generated-tests');
const testsFeedback = document.getElementById('tests-feedback');
const improveTestsBtn = document.getElementById('improve-tests-btn');
const runTestsBtn = document.getElementById('run-tests-btn');
const testResults = document.getElementById('test-results');
const regenerateBtn = document.getElementById('regenerate-btn');

function updateSectionsVisibility(testResult) {
    const testGenerationSection = document.getElementById('test-generation-section');
    const regenerationSection = document.getElementById('regeneration-section');

    const generatedCodeElement = generatedCode.querySelector('code');
    const generatedTestsElement = generatedTests.querySelector('code');

    if (generatedCodeElement.textContent.trim() !== '') {
        testGenerationSection.style.display = 'block';
    } else {
        testGenerationSection.style.display = 'none';
    }

    if (generatedTestsElement.textContent.trim() !== '') {
        regenerationSection.style.display = 'block';
    } else {
        regenerationSection.style.display = 'none';
    }

    if (currentSnippetId !== null) {
        const snippet = snippets.find(s => s.id === currentSnippetId);
        if (snippet.language !== 'python') {
            runTestsBtn.disabled = true;
            runTestsBtn.classList.remove('bg-teal-500');
            runTestsBtn.classList.add('bg-gray-500', 'cursor-not-allowed');
        } else {
            runTestsBtn.disabled = false;
            runTestsBtn.classList.remove('bg-gray-500', 'cursor-not-allowed');
            runTestsBtn.classList.add('bg-teal-500');
        }
    }

    if (testResult === 'failure') {
        regenerateBtn.disabled = false;
        regenerateBtn.classList.remove('bg-gray-500');
        regenerateBtn.classList.add('bg-green-500');
    } else if (testResult === 'success') {
        regenerateBtn.disabled = true;
        regenerateBtn.classList.remove('bg-green-500');
        regenerateBtn.classList.add('bg-gray-500');
    }
}

async function fetchSnippets() {
    const response = await fetch('/api/snippets');
    if (!response.ok) {
        console.error('Failed to fetch snippets:', response.status);
        return [];
    }
    return await response.json();
}

let currentSnippetId = null;

function renderSnippetList(snippets) {
    snippetList.innerHTML = '';
    snippets.forEach(snippet => {
        const isSelected = snippet.id === currentSnippetId;
        const li = document.createElement('li');
        const title = snippet.title || 'New Snippet';
        const language = snippet.language ? snippet.language.charAt(0).toUpperCase() + snippet.language.slice(1) : "";
        li.innerHTML = `
            <a href="#" class="snippet-item w-full block p-2 rounded ${isSelected ? 'bg-gray-500 text-white' : 'bg-gray-300'}" data-id="${snippet.id}">
                ${title} | ${language}
            </a>
            ${!isSelected ? '<button class="delete-btn bg-red-500 text-white px-2 py-1 rounded" data-id="' + snippet.id + '">Delete</button>' : ''}
        `;
        li.classList.add('flex', 'justify-between', 'mb-4');
        snippetList.appendChild(li);
    });
}

function renderSnippetDetail(snippet) {
    if (!snippet) {
        noSnippetSelected.style.display = 'block';
        snippetEditor.style.display = 'none';
        return;
    }

    noSnippetSelected.style.display = 'none';
    snippetEditor.style.display = 'block';

    codeDescription.value = snippet.description || '';
    generatedCode.querySelector('code').textContent = snippet.code || '';
    codeFeedback.value = snippet.feedback || '';
    generatedTests.querySelector('code').textContent = snippet.test_code || '';
    testsFeedback.value = snippet.test_feedback || '';
    testResults.innerHTML = '';

    highlightCode(generatedCode.querySelector('code'));
    highlightCode(generatedTests.querySelector('code'));

    updateSectionsVisibility();
}

async function createSnippet() {
    const response = await fetch('/api/snippets', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({}),
    });
    const newSnippet = await response.json();
    snippets.unshift(newSnippet);
    renderSnippetList(snippets);

    const newSnippetItem = document.querySelector(`.snippet-item[data-id="${newSnippet.id}"]`);
    newSnippetItem.click();
}

createBtn.addEventListener('click', createSnippet);

async function updateSnippet(snippet) {
    await fetch(`/api/snippets/${snippet.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(snippet),
    });
    renderSnippetList(snippets);
}

async function deleteSnippet(id) {
    const response = await fetch(`/api/snippets/${id}`, {method: 'DELETE'});
    if (!response.ok) {
        console.error('Failed to delete snippet:', response.status);
    }
    return response.ok;
}

async function fetchSnippetDetail(id) {
    const response = await fetch(`/api/snippets/${id}`);
    if (!response.ok) {
        console.error('Failed to fetch snippet detail:', response.status);
        return null;
    }
    return await response.json();
}

snippetList.addEventListener('click', async e => {
    if (e.target.matches('.snippet-item')) {
        const snippetId = Number(e.target.dataset.id);
        const snippet = await fetchSnippetDetail(snippetId);
        if (snippet) {
            renderSnippetDetail(snippet);
            currentSnippetId = snippetId;
            renderSnippetList(snippets);
        }
    } else if (e.target.matches('.delete-btn')) {
        const snippetId = Number(e.target.dataset.id);
        if (await deleteSnippet(snippetId)) {
            snippets = snippets.filter(snippet => snippet.id !== snippetId);
            if (currentSnippetId === snippetId) {
                currentSnippetId = null;
                renderSnippetDetail(null);
            }
            renderSnippetList(snippets);
        }
    }
});

function processCodeString(codeString) {
    codeString = codeString.replace(/^```.*?\n/, '');
    codeString = codeString.replace(/\n```$/, '');
    return codeString;
}

async function streamResponse(response, callback) {
    const reader = response.body.getReader();
    let decoder = new TextDecoder();

    let result = '';
    while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        
        const decodedValue = decoder.decode(value);
        result += decodedValue;
        
        callback(decodedValue);
    }
    
    return result;
}

function highlightCode(codeElement) {
    if (codeElement.hasAttribute('data-highlighted')) {
        codeElement.removeAttribute('data-highlighted');
        hljs.highlightElement(codeElement);
    } else {
        codeElement.setAttribute('data-highlighted', 'true');
    }
}

async function generateCode() {
    const snippet = snippets.find(s => s.id === currentSnippetId);
    snippet.description = codeDescription.value;

    const codeElement = generatedCode.querySelector('code');
    codeElement.textContent = '';

    const [codeResponse, titleResponse, langPromise] = [
        fetch('/api/generate/code', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                description: codeDescription.value,
            }),
        }),
        fetch('/api/generate/title', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                description: codeDescription.value,
            }),
        }),
        fetch('/api/generate/detect_language', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                description: codeDescription.value,
            }),
        }).then(response => response.json())
    ];

    const results = await Promise.allSettled([codeResponse, titleResponse, langPromise]);

    const codeResult = results[0];
    const titleResult = results[1];
    const langResult = results[2];

    if (codeResult.status === 'fulfilled') {
        let codeData = await streamResponse(codeResult.value, data => {
            codeElement.textContent += data;
            highlightCode(codeElement);
            updateSectionsVisibility();
        });
        codeData = processCodeString(codeData);
        snippet.code = codeData;
        codeElement.textContent = codeData;
        highlightCode(codeElement);
    }

    if (titleResult.status === 'fulfilled') {
        const titleData = await streamResponse(titleResult.value, data => {
            snippet.title += data;
        });
    }

    if (langResult.status === 'fulfilled') {
        const langData = langResult.value;
        if (langData.language !== snippet.language) {
            snippet.language = langData.language || '';
        }
        if (langData.language) {
            codeElement.className = langData.language;
        }
        highlightCode(codeElement);
    }

    await updateSnippet(snippet);
}

generateCodeBtn.addEventListener('click', generateCode);

async function improveCode() {
    const snippet = snippets.find(s => s.id === currentSnippetId);
    snippet.feedback = codeFeedback.value;

    const codeElement = generatedCode.querySelector('code');
    codeElement.textContent = '';

    const response = await fetch('/api/generate/code_from_feedback', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            description: codeDescription.value,
            code: snippet.code,
            language: snippet.language,
            feedback: codeFeedback.value,
        }),
    });

    let codeData = await streamResponse(response, data => {
        codeElement.textContent += data;
        highlightCode(codeElement);
    });

    codeData = processCodeString(codeData);
    snippet.code = codeData;
    codeElement.textContent = codeData;
    highlightCode(codeElement);
    await updateSnippet(snippet);
}

improveCodeBtn.addEventListener('click', improveCode);

async function generateTests() {
    const snippet = snippets.find(s => s.id === currentSnippetId);

    const testsElement = generatedTests.querySelector('code');
    testsElement.textContent = '';

    const response = await fetch('/api/generate/tests', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            description: codeDescription.value,
            code: snippet.code,
            language: snippet.language,
            feedback: codeFeedback.value,
        }),
    });
    
    let testsData = await streamResponse(response, data => {
        testsElement.textContent += data;
        highlightCode(testsElement);
        updateSectionsVisibility();
    });

    testsData = processCodeString(testsData);
    snippet.test_code = testsData;
    testsElement.textContent = testsData;
    highlightCode(testsElement);
    await updateSnippet(snippet);
}

generateTestsBtn.addEventListener('click', generateTests);

async function improveTests() {
    const snippet = snippets.find(s => s.id === currentSnippetId);
    snippet.test_feedback = testsFeedback.value;

    const testsElement = generatedTests.querySelector('code');
    testsElement.textContent = '';

    const response = await fetch('/api/generate/tests_from_feedback', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            description: codeDescription.value,
            code: snippet.code,
            language: snippet.language,
            feedback: codeFeedback.value,
            test_code: snippet.test_code,
            test_feedback: testsFeedback.value,
        }),
    });

    let testsData = await streamResponse(response, data => {
        testsElement.textContent += data;
        highlightCode(testsElement);
    });

    testsData = processCodeString(testsData);
    snippet.test_code = testsData;
    testsElement.textContent = testsData;
    highlightCode(testsElement);
    await updateSnippet(snippet);
}

improveTestsBtn.addEventListener('click', improveTests);

async function runTests() {
    const snippet = snippets.find(s => s.id === currentSnippetId);

    const response = await fetch('/api/run/python', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            snippet_id: currentSnippetId,
            code: snippet.code,
            language: snippet.language,
            test_code: snippet.test_code,
        }),
    });
    const data = await response.json();
    testResults.innerHTML = `
        <div class="p-4 rounded mb-4 ${data.result === 'success' ? 'bg-green-300' : 'bg-red-300'}">
            ${data.message}
        </div>
    `;
    updateSectionsVisibility(data.result);
}

runTestsBtn.addEventListener('click', runTests);

async function regenerateCode() {
    const snippet = snippets.find(s => s.id === currentSnippetId);

    const codeElement = generatedCode.querySelector('code');
    codeElement.textContent = '';

    const response = await fetch('/api/generate/regenerate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            description: codeDescription.value,
            code: snippet.code,
            language: snippet.language,
            feedback: codeFeedback.value,
            test_code: generatedTests.querySelector('code').textContent,
            test_feedback: testsFeedback.value,
            error_message: snippet.test_result_message,
        }),
    });

    let codeData = await streamResponse(response, data => {
        codeElement.textContent += data;
        highlightCode(codeElement);
    });

    codeData = processCodeString(codeData);
    snippet.code = codeData;
    codeElement.textContent = codeData;
    highlightCode(codeElement);
    await updateSnippet(snippet);
}

regenerateBtn.addEventListener('click', regenerateCode);

document.addEventListener('DOMContentLoaded', async () => {
    snippets = await fetchSnippets();
    renderSnippetList(snippets);
    if (snippets.length > 0) {
        const firstSnippetItem = document.querySelector('.snippet-item');
        firstSnippetItem.click();
        renderSnippetDetail(snippets[0]);
    }
});