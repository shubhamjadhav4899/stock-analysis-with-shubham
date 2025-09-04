/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

// DOM Elements
const chartForm = document.getElementById('chart-form') as HTMLFormElement;
const chartStockInput = document.getElementById('chart-stock-input') as HTMLInputElement;
const chartSearchButton = document.getElementById('chart-search-button') as HTMLButtonElement;
const chartOutputContainer = document.getElementById('chart-output-container') as HTMLDivElement;

const financialsForm = document.getElementById('financials-form') as HTMLFormElement;
const financialsStockInput = document.getElementById('financials-stock-input') as HTMLInputElement;
const financialsSearchButton = document.getElementById('financials-search-button') as HTMLButtonElement;
const financialsOutputContainer = document.getElementById('financials-output-container') as HTMLDivElement;

const newsOutputContainer = document.getElementById('news-output-container') as HTMLDivElement;

let ai: GoogleGenAI | null = null;

try {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} catch (error) {
    console.error(error);
    // Show error in all panels if AI fails to init
    showError(chartOutputContainer, 'Failed to initialize AI client.');
    showError(financialsOutputContainer, 'Failed to initialize AI client.');
    showError(newsOutputContainer, 'Failed to initialize AI client.');
}

// --- Event Listeners ---
chartForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = chartStockInput.value.trim();
    if (!query || !ai) return;
    fetchChartAnalysis(query);
});

financialsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = financialsStockInput.value.trim();
    if (!query || !ai) return;
    fetchFinancialDetails(query);
});

// --- Core Functions ---
async function fetchChartAnalysis(query: string) {
    setLoading(chartOutputContainer, chartSearchButton, 'Analyzing...');
    try {
        const prompt = `Analyze the historical stock price chart for "${query}". Describe the key trends, support and resistance levels, and any notable chart patterns over the last 6-12 months. Provide a summary of its recent performance and volatility. Use Google Search to get the latest data.`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        renderContent(chartOutputContainer, response.text, response.candidates?.[0]?.groundingMetadata?.groundingChunks);
    } catch (error) {
        console.error('Error fetching chart analysis:', error);
        showError(chartOutputContainer, `Failed to analyze chart for ${query}. Please try another stock.`);
    } finally {
        resetButton(chartSearchButton, 'Get Analysis');
    }
}

async function fetchFinancialDetails(query: string) {
    setLoading(financialsOutputContainer, financialsSearchButton, 'Fetching...');
    try {
        const prompt = `Provide the latest key financial details for the stock: "${query}". Include:
- Market Capitalization
- P/E Ratio (TTM)
- Earnings Per Share (EPS) (TTM)
- Dividend Yield
- 52-Week High/Low
- A brief summary of their latest quarterly earnings report.
Use Google Search to get the latest data.`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        renderContent(financialsOutputContainer, response.text, response.candidates?.[0]?.groundingMetadata?.groundingChunks);
    } catch (error) {
        console.error('Error fetching financial details:', error);
        showError(financialsOutputContainer, `Failed to fetch details for ${query}. Please try again.`);
    } finally {
        resetButton(financialsSearchButton, 'Get Details');
    }
}

async function fetchTrendingNews() {
    setLoading(newsOutputContainer);
    try {
        const prompt = `What are the top 5 trending news stories and headlines related to the Indian stock market today? For each, provide a brief one-paragraph summary. Use Google Search to get the latest information.`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        renderContent(newsOutputContainer, response.text, response.candidates?.[0]?.groundingMetadata?.groundingChunks);
    } catch (error) {
        console.error('Error fetching trending news:', error);
        showError(newsOutputContainer, 'Could not fetch trending news at this time.');
    }
}

// --- UI Helper Functions ---
function setLoading(container: HTMLDivElement, button?: HTMLButtonElement, buttonText: string = 'Loading...') {
    container.innerHTML = '<div class="loader" aria-label="Loading content"></div>';
    if (button) {
        button.disabled = true;
        button.textContent = buttonText;
    }
}

function resetButton(button: HTMLButtonElement, originalText: string) {
    button.disabled = false;
    button.textContent = originalText;
}

function showError(container: HTMLDivElement, message: string) {
    container.innerHTML = `<div class="error-message" role="alert">${message}</div>`;
}

function renderContent(container: HTMLDivElement, text: string, groundingChunks?: any[]) {
    container.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
    
    if (groundingChunks && groundingChunks.length > 0) {
        const sources = groundingChunks
            .map(chunk => chunk.web)
            .filter(web => web && web.uri);

        if (sources.length > 0) {
            const uniqueSources = [...new Map(sources.map(item => [item.uri, item])).values()];

            let sourcesHtml = '<h3>Sources</h3><ul>';
            uniqueSources.forEach(source => {
                sourcesHtml += `<li><a href="${source.uri}" target="_blank" rel="noopener noreferrer">${source.title || source.uri}</a></li>`;
            });
            sourcesHtml += '</ul>';
            container.innerHTML += sourcesHtml;
        }
    }
}

// --- Initial Load ---
if (ai) {
    fetchTrendingNews();
}
