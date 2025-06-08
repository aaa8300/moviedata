let movieData = [];

    document.getElementById('fileInput').addEventListener('change', function(event) {
      const file = event.target.files[0];
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          movieData = results.data;
          alert("CSV loaded! Type your movie and genre then click Analyze.");
        }
      });
    });

    function analyze() {
      const favMovie = document.getElementById("favMovie").value;
      const genre = document.getElementById("genreInput").value;
      const output = document.getElementById("output");
      output.innerHTML = "";

      const favMovieData = movieData.find(m => m.movie_title === favMovie);
      const genreMovies = movieData.filter(m => m.genres && m.genres.includes(genre));

      if (!favMovieData) {
        output.innerHTML += "<p>Movie not found.</p>";
        return;
      }

      output.innerHTML += `<h3>Favorite Movie: ${favMovie}</h3>`;
      output.innerHTML += `<pre>${JSON.stringify(favMovieData, null, 2)}</pre>`;

      if (genreMovies.length === 0) {
        output.innerHTML += "<p>No movies found for that genre.</p>";
        return;
      }

      const ratings = genreMovies.map(m => parseFloat(m.audience_rating)).filter(r => !isNaN(r));
      const min = Math.min(...ratings);
      const max = Math.max(...ratings);
      const mean = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);

      output.innerHTML += `<p>Movies in ${genre}: ${ratings.length}</p>`;
      output.innerHTML += `<p>Min Rating: ${min}</p>`;
      output.innerHTML += `<p>Max Rating: ${max}</p>`;
      output.innerHTML += `<p>Average Rating: ${mean}</p>`;

      if (favMovieData && favMovieData.audience_rating) {
        const favRating = parseFloat(favMovieData.audience_rating);
        output.innerHTML += `<p>${favMovie} is ${(favRating - mean).toFixed(1)} points higher than average.</p>`;
      }

      drawHistogram(ratings);
      drawScatter(genreMovies);
    }

    function drawHistogram(ratings) {
      const ctx = document.getElementById('histogramChart').getContext('2d');
      const bins = Array(20).fill(0);
      ratings.forEach(r => bins[Math.floor(r / 5)]++);
      const labels = bins.map((_, i) => `${i * 5}-${i * 5 + 4}`);

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Audience Ratings',
            data: bins,
            backgroundColor: 'skyblue'
          }]
        }
      });
    }

    function drawScatter(movies) {
      const ctx = document.getElementById('scatterChart').getContext('2d');
      const points = movies
        .map(m => ({
          x: parseFloat(m.audience_rating),
          y: parseFloat(m.critic_rating)
        }))
        .filter(p => !isNaN(p.x) && !isNaN(p.y));

      new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Audience vs Critic',
            data: points,
            backgroundColor: 'lightgreen'
          }]
        },
        options: {
          scales: {
            x: { title: { display: true, text: 'Audience' }, min: 0, max: 100 },
            y: { title: { display: true, text: 'Critic' }, min: 0, max: 100 }
          }
        }
      });
    }