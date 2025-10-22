// Country Explorer Application
// Main application logic with search, API integrations, and real-time updates

/* global countriesData */

// Global variables
let populationInterval = null;
let currentPopulation = 0;

// Annual growth rate for population estimation (1.05%)
const ANNUAL_GROWTH_RATE = 0.0105;
const GROWTH_PER_SECOND = ANNUAL_GROWTH_RATE / (365.25 * 24 * 60 * 60);

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeSearch();
    loadCryptocurrencyRates();

    // Refresh crypto rates every 60 seconds
    setInterval(loadCryptocurrencyRates, 60000);
});

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('countrySearch');
    const searchResults = document.getElementById('searchResults');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();

        if (query.length === 0) {
            searchResults.classList.add('hidden');
            return;
        }

        // Filter countries based on search query
        const filteredCountries = countriesData.filter(country =>
            country.country.toLowerCase().includes(query) ||
            country.capital.toLowerCase().includes(query)
        );

        displaySearchResults(filteredCountries, searchResults);
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
}

function handledownkey(event) {
    event.key;
    if (event.key === 'Enter') {
        selectCountry(countryName);
    }
}

// Display search results
function displaySearchResults(countries, container) {
    if (countries.length === 0) {
        container.innerHTML = '<div class="search-result-item text-gray-500">No countries found</div>';
        container.classList.remove('hidden');
        return;
    }

    container.innerHTML = countries.slice(0, 10).map(country => `
        <div class="search-result-item" onclick="selectCountry('${country.country.replace(/'/g, "\\'")}')">
            <div class="font-bold text-cyan-300">${country.country}</div>
            <div class="text-sm text-gray-400">${country.capital}</div>
        </div>
    `).join('');

    container.classList.remove('hidden');
}

// Select and display country
// eslint-disable-next-line no-unused-vars
function selectCountry(countryName) {
    const country = countriesData.find(c => c.country === countryName);

    if (!country) {
        console.error('Country not found:', countryName);
        return;
    }

    // Hide search results and welcome message
    document.getElementById('searchResults').classList.add('hidden');
    document.getElementById('welcomeMessage').classList.add('hidden');

    // Show country info section
    const countryInfo = document.getElementById('countryInfo');
    countryInfo.classList.remove('hidden');
    countryInfo.classList.add('fade-in');

    // Display country data
    displayCountryData(country);

    // Load external data
    loadCountryFlag(country.country);
    loadCountryMap(country.country, country.coordinates);

    // Start population counter
    startPopulationCounter(country.population);

    // Scroll to country info
    countryInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Display country data
function displayCountryData(country) {
    document.getElementById('countryName').textContent = country.country;
    document.getElementById('countryCapital').textContent = `Capital: ${country.capital}`;
    document.getElementById('countryGDP').textContent = country.gdp;
    document.getElementById('countryArea').textContent = country.area;
    document.getElementById('countryCoordinates').textContent = country.coordinates;
    document.getElementById('countryLanguages').textContent = country.official_languages;
    document.getElementById('countryCurrency').textContent = country.currency;
    document.getElementById('countryCode').textContent = country.country_code;
    document.getElementById('countryReligion').textContent = country.religion;
    document.getElementById('countryElevation').textContent = country.elevation || 'N/A';
    document.getElementById('countryGold').textContent = country.gold_reserves;
}

// Load country flag from REST Countries API
async function loadCountryFlag(countryName) {
    const flagContainer = document.getElementById('countryFlag');
    flagContainer.innerHTML = '<div class="flex items-center justify-center h-full"><div class="loading-spinner"></div></div>';

    try {
        const response = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=true`);

        if (!response.ok) {
            throw new Error('Failed to fetch flag');
        }

        const data = await response.json();

        if (data && data.length > 0 && data[0].flags) {
            const flagUrl = data[0].flags.svg || data[0].flags.png;
            flagContainer.innerHTML = `<img src="${flagUrl}" alt="${countryName} flag" class="w-full h-full object-cover">`;
        } else {
            flagContainer.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Flag not available</div>';
        }
    } catch (error) {
        console.error('Error loading flag:', error);
        flagContainer.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Flag not available</div>';
    }
}

// Load country map using OpenStreetMap
function loadCountryMap(countryName, coordinates) {
    const mapContainer = document.getElementById('countryMap');

    // Parse coordinates
    const coordParts = coordinates.split(/[,\s]+/);
    let lat = 0, lon = 0;

    try {
        // Extract latitude and longitude
        for (let i = 0; i < coordParts.length; i++) {
            const part = coordParts[i].trim();
            if (part.includes('N') || part.includes('S')) {
                lat = parseFloat(part.replace(/[NS]/g, ''));
                if (part.includes('S')) lat = -lat;
            } else if (part.includes('E') || part.includes('W')) {
                lon = parseFloat(part.replace(/[EW]/g, ''));
                if (part.includes('W')) lon = -lon;
            }
        }

        // Create OpenStreetMap embed
        const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=`;

        mapContainer.innerHTML = `
            <iframe 
                src="${mapUrl}"
                style="border: none; width: 100%; height: 100%;"
                allowfullscreen
                loading="lazy"
            ></iframe>
        `;
    } catch (error) {
        console.error('Error loading map:', error);
        mapContainer.innerHTML = `
            <div class="flex items-center justify-center h-full text-gray-400">
                <div class="text-center">
                    <div class="text-4xl mb-2">🗺️</div>
                    <div>Map not available</div>
                </div>
            </div>
        `;
    }
}

// Start population counter with auto-update
function startPopulationCounter(initialPopulation) {
    // Clear existing interval
    if (populationInterval) {
        clearInterval(populationInterval);
    }

    currentPopulation = initialPopulation;
    const counterElement = document.getElementById('populationCounter');

    // Update display immediately
    updatePopulationDisplay(counterElement);

    // Update every second
    populationInterval = setInterval(() => {
        currentPopulation += currentPopulation * GROWTH_PER_SECOND;
        updatePopulationDisplay(counterElement);
    }, 1000);
}

// Update population display with formatting
function updatePopulationDisplay(element) {
    const formatted = Math.floor(currentPopulation).toLocaleString('en-US');
    element.textContent = formatted;
}

// Load cryptocurrency rates from CoinGecko API
async function loadCryptocurrencyRates() {
    const cryptoContainer = document.getElementById('cryptoRates');

    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd&include_24hr_change=true');

        if (!response.ok) {
            throw new Error('Failed to fetch crypto rates');
        }

        const data = await response.json();

        displayCryptocurrencyRates(data, cryptoContainer);
    } catch (error) {
        console.error('Error loading cryptocurrency rates:', error);
        cryptoContainer.innerHTML = `
            <div class="col-span-full text-center text-gray-500">
                <div class="text-3xl mb-2">⚠️</div>
                <div>Unable to load cryptocurrency rates</div>
                <div class="text-sm mt-2">Please check your internet connection</div>
            </div>
        `;
    }
}

// Display cryptocurrency rates
function displayCryptocurrencyRates(data, container) {
    const cryptos = [
        { id: 'bitcoin', name: 'Bitcoin', symbol: '₿', color: 'orange' },
        { id: 'ethereum', name: 'Ethereum', symbol: 'Ξ', color: 'purple' },
        { id: 'tether', name: 'Tether', symbol: '₮', color: 'green' }
    ];

    container.innerHTML = cryptos.map(crypto => {
        const cryptoData = data[crypto.id];
        if (!cryptoData) return '';

        const price = cryptoData.usd;
        const change = cryptoData.usd_24h_change || 0;
        const isPositive = change >= 0;
        const changeClass = isPositive ? 'positive' : 'negative';
        const changeSymbol = isPositive ? '▲' : '▼';

        return `
            <div class="crypto-card">
                <div class="flex items-center gap-2 mb-3">
                    <span class="text-3xl">${crypto.symbol}</span>
                    <div class="crypto-name">${crypto.name}</div>
                </div>
                <div class="crypto-price">$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div class="crypto-change ${changeClass}">
                    ${changeSymbol} ${Math.abs(change).toFixed(2)}%
                </div>
            </div>
        `;
    }).join('');
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (populationInterval) {
        clearInterval(populationInterval);
    }
});
