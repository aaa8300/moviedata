let movieData = [];
let histogramChart = null;
let scatterChart = null;

// Load and parse CSV file using PapaParse
async function loadCSVData(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        const parsed = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true
        });

        movieData = parsed.data;
        console.log("Movie data loaded:", movieData);
    } catch (error) {
        console.error('Error loading CSV file:', error);
        showError("Failed to load movie data.");
    }
}

// Load data on page load
window.addEventListener('DOMContentLoaded', () => {
    loadCSVData('rotten_tomatoes_movies.csv');
});

// Triggered by Enter key or button
function analyze() {
    const favMovieInput = document.getElementById("favMovie");
    const favMovie = favMovieInput.value.trim();
    const resultsSection = document.getElementById("results");
    const errorMessage = document.getElementById("errorMessage");

    errorMessage.style.display = 'none';
    resultsSection.style.display = 'none';

    if (!favMovie) {
        showError("Please enter a movie title!");
        return;
    }

    if (!Array.isArray(movieData) || movieData.length === 0) {
        showError("Movie data is still loading. Please wait a moment and try again.");
        return;
    }

    // Case-insensitive search
    const favMovieData = movieData.find(m =>
        m.movie_title &&
        m.movie_title.toLowerCase() === favMovie.toLowerCase()
    );

    if (!favMovieData) {
        showError(`Movie "${favMovie}" not found in the database. Please check the spelling or try another movie.`);
        return;
    }

    const movieGenres = (favMovieData.genres && typeof favMovieData.genres === 'string')
        ? favMovieData.genres.split('|')
        : [];

    if (movieGenres.length === 0) {
        showError("No genre information available for this movie.");
        return;
    }

    const genreMovies = movieData.filter(m => {
        if (!m.genres || typeof m.genres !== 'string') return false;
        const genres = m.genres.split('|');
        return genres.some(genre => movieGenres.includes(genre));
    });

    displayResults(favMovieData, genreMovies, movieGenres);
    resultsSection.style.display = 'block';
}

        function displayResults(favMovieData, genreMovies, movieGenres) {
            displayMovieCard(favMovieData, movieGenres);
            displayStats(favMovieData, genreMovies, movieGenres);
            drawCharts(genreMovies);
        }

        function displayMovieCard(movie, genres) {
            const movieCard = document.getElementById('movieCard');
            
            // Safely handle ratings
            let audienceRating = 0;
            let criticRating = 0;
            
            if (typeof movie.audience_rating === 'string') {
                audienceRating = parseFloat(movie.audience_rating) || 0;
            } else if (typeof movie.audience_rating === 'number') {
                audienceRating = movie.audience_rating;
            }
            
            if (typeof movie.critic_rating === 'string') {
                criticRating = parseFloat(movie.critic_rating) || 0;
            } else if (typeof movie.critic_rating === 'number') {
                criticRating = movie.critic_rating;
            }
            
            movieCard.innerHTML = `
                <div class="movie-title">
                    🎬 ${movie.movie_title}
                    <span class="genre-tag">${genres.join(' • ')}</span>
                </div>
                <div class="movie-details">
                    <div class="detail-item">
                        <div class="detail-label">Audience Score</div>
                        <div class="detail-value">${audienceRating}%</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Critic Score</div>
                        <div class="detail-value">${criticRating}%</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Year</div>
                        <div class="detail-value">${movie.year_released || 'N/A'}</div>
                    </div>
                    
                </div>
            `;
        }

        function displayStats(favMovie, genreMovies, genres) {
            const statsCard = document.getElementById('statsCard');
            const ratings = genreMovies
                .map(m => {
                    const rating = m.audience_rating;
                    // Handle both string and number inputs
                    if (typeof rating === 'string') return parseFloat(rating);
                    if (typeof rating === 'number') return rating;
                    return NaN;
                })
                .filter(r => !isNaN(r));

            if (ratings.length === 0) {
                statsCard.innerHTML = '<div class="stats-title">❌ No rating data available</div>';
                return;
            }

            const min = Math.min(...ratings);
            const max = Math.max(...ratings);
            const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
            
            // Handle favorite movie rating safely
            let favRating = 0;
            if (typeof favMovie.audience_rating === 'string') {
                favRating = parseFloat(favMovie.audience_rating) || 0;
            } else if (typeof favMovie.audience_rating === 'number') {
                favRating = favMovie.audience_rating;
            }
            
            const comparison = favRating - mean;

            statsCard.innerHTML = `
                <div class="stats-title">📈 Genre Statistics (${genres.join(', ')})</div>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number">${genreMovies.length}</div>
                        <div class="stat-label">Similar Movies</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${mean.toFixed(1)}%</div>
                        <div class="stat-label">Average Rating</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${min}%</div>
                        <div class="stat-label">Lowest Rating</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${max}%</div>
                        <div class="stat-label">Highest Rating</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${comparison > 0 ? '+' : ''}${comparison.toFixed(1)}</div>
                        <div class="stat-label">vs Average</div>
                    </div>
                </div>
            `;
        }

        function drawCharts(movies) {
            const ratings = movies
                .map(m => {
                    const rating = m.audience_rating;
                    if (typeof rating === 'string') return parseFloat(rating);
                    if (typeof rating === 'number') return rating;
                    return NaN;
                })
                .filter(r => !isNaN(r));

            drawHistogram(ratings);
            drawScatter(movies);
        }

        function drawHistogram(ratings) {
            const ctx = document.getElementById('histogramChart').getContext('2d');
            
            if (histogramChart) {
                histogramChart.destroy();
            }

            // Create bins for the histogram
            const bins = Array(10).fill(0);
            ratings.forEach(r => {
                const binIndex = Math.min(Math.floor(r / 10), 9);
                bins[binIndex]++;
            });

            const labels = bins.map((_, i) => `${i * 10}-${i * 10 + 9}%`);

            histogramChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Number of Movies',
                        data: bins,
                        backgroundColor: 'rgba(78, 205, 196, 0.8)',
                        borderColor: 'rgba(78, 205, 196, 1)',
                        borderWidth: 2,
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }

        function drawScatter(movies) {
            const ctx = document.getElementById('scatterChart').getContext('2d');
            
            if (scatterChart) {
                scatterChart.destroy();
            }

            const points = movies
                .map(m => {
                    // Safely handle both ratings
                    let audienceRating = NaN;
                    let criticRating = NaN;
                    
                    if (typeof m.audience_rating === 'string') {
                        audienceRating = parseFloat(m.audience_rating);
                    } else if (typeof m.audience_rating === 'number') {
                        audienceRating = m.audience_rating;
                    }
                    
                    if (typeof m.critic_rating === 'string') {
                        criticRating = parseFloat(m.critic_rating);
                    } else if (typeof m.critic_rating === 'number') {
                        criticRating = m.critic_rating;
                    }
                    
                    return {
                        x: audienceRating,
                        y: criticRating,
                        label: m.movie_title || 'Unknown Title'
                    };
                })
                .filter(p => !isNaN(p.x) && !isNaN(p.y));

            scatterChart = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: 'Movies',
                        data: points,
                        backgroundColor: 'rgba(255, 107, 107, 0.6)',
                        borderColor: 'rgba(255, 107, 107, 1)',
                        borderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const point = points[context.dataIndex];
                                    return `${point.label}: Audience ${point.x}%, Critics ${point.y}%`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Audience Rating (%)'
                            },
                            min: 0,
                            max: 100
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Critic Rating (%)'
                            },
                            min: 0,
                            max: 100
                        }
                    }
                }
            });
        }

        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }

        // Allow Enter key to trigger analysis
        document.getElementById('favMovie').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                analyze();
            }
        });
