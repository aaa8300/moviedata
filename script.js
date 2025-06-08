let movieData = [];
        let histogramChart = null;
        let scatterChart = null;

        // Load CSV data from file
        window.addEventListener('load', function() {
            loadCSVData();
        });

        async function loadCSVData() {
            try {
                // Try to read the CSV file using the file system API
                const csvContent = await window.fs.readFile('rotten_tomatoes_movies.csv', { encoding: 'utf8' });
                
                Papa.parse(csvContent, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: true,
                    complete: function(results) {
                        movieData = results.data;
                        document.getElementById('loading').style.display = 'none';
                        console.log('Movie data loaded:', movieData.length, 'movies');
                        
                        // Show success message
                        const loadingDiv = document.getElementById('loading');
                        loadingDiv.innerHTML = '✅ Movie data loaded successfully!';
                        loadingDiv.style.color = '#28a745';
                        setTimeout(() => {
                            loadingDiv.style.display = 'none';
                        }, 2000);
                    },
                    error: function(error) {
                        console.error('Error parsing CSV:', error);
                        showLoadingError('Error parsing CSV file. Please check the file format.');
                    }
                });
            } catch (error) {
                console.error('Error loading CSV file:', error);
                
                // If file reading fails, try to fetch from the same directory
                try {
                    const response = await fetch('rotten_tomatoes_movies.csv');
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    const csvContent = await response.text();
                    
                    Papa.parse(csvContent, {
                        header: true,
                        skipEmptyLines: true,
                        dynamicTyping: true,
                        complete: function(results) {
                            movieData = results.data;
                            document.getElementById('loading').style.display = 'none';
                            console.log('Movie data loaded:', movieData.length, 'movies');
                            
                            // Show success message
                            const loadingDiv = document.getElementById('loading');
                            loadingDiv.innerHTML = '✅ Movie data loaded successfully!';
                            loadingDiv.style.color = '#28a745';
                            setTimeout(() => {
                                loadingDiv.style.display = 'none';
                            }, 2000);
                        },
                        error: function(error) {
                            console.error('Error parsing CSV:', error);
                            showLoadingError('Error parsing CSV file. Please check the file format.');
                        }
                    });
                } catch (fetchError) {
                    console.error('Error fetching CSV file:', fetchError);
                    showLoadingError('Could not load movie data. Please make sure "rotten_tomatoes_movies.csv" exists in the same folder.');
                }
            }
        }

        function showLoadingError(message) {
            const loadingDiv = document.getElementById('loading');
            loadingDiv.innerHTML = `❌ ${message}`;
            loadingDiv.style.color = '#dc3545';
            
            // Also show in error message div
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }

        function analyze() {
            const favMovie = document.getElementById("favMovie").value.trim();
            const resultsSection = document.getElementById("results");
            const errorMessage = document.getElementById("errorMessage");
            
            // Clear previous results
            errorMessage.style.display = 'none';
            resultsSection.style.display = 'none';

            if (!favMovie) {
                showError("Please enter a movie title!");
                return;
            }

            if (movieData.length === 0) {
                showError("Movie data is still loading. Please wait a moment and try again.");
                return;
            }

            // Find the movie (case-insensitive)
            const favMovieData = movieData.find(m => 
                m.movie_title && m.movie_title.toLowerCase() === favMovie.toLowerCase()
            );

            if (!favMovieData) {
                showError(`Movie "${favMovie}" not found in our database. Please check the spelling or try another movie.`);
                return;
            }

            // Get the movie's genres
            const movieGenres = favMovieData.genres ? favMovieData.genres.split('|') : [];
            
            if (movieGenres.length === 0) {
                showError("No genre information available for this movie.");
                return;
            }

            // Get all movies that share at least one genre with the favorite movie
            const genreMovies = movieData.filter(m => {
                if (!m.genres) return false;
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
            const audienceRating = parseFloat(movie.audience_rating) || 0;
            const criticRating = parseFloat(movie.critic_rating) || 0;
            
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
                        <div class="detail-value">${movie.year || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Director</div>
                        <div class="detail-value">${movie.director || 'N/A'}</div>
                    </div>
                </div>
            `;
        }

        function displayStats(favMovie, genreMovies, genres) {
            const statsCard = document.getElementById('statsCard');
            const ratings = genreMovies
                .map(m => parseFloat(m.audience_rating))
                .filter(r => !isNaN(r));

            if (ratings.length === 0) {
                statsCard.innerHTML = '<div class="stats-title">❌ No rating data available</div>';
                return;
            }

            const min = Math.min(...ratings);
            const max = Math.max(...ratings);
            const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
            const favRating = parseFloat(favMovie.audience_rating) || 0;
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
                .map(m => parseFloat(m.audience_rating))
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
                .map(m => ({
                    x: parseFloat(m.audience_rating),
                    y: parseFloat(m.critic_rating),
                    label: m.movie_title
                }))
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