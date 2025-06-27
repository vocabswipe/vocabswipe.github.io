<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>VocabSwipe</title>
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js"></script>
    <script src="https://hammerjs.github.io/dist/hammer.min.js"></script>
</head>
<body data-theme="bright">
    <div class="container">
        <button class="theme-toggle" aria-label="Toggle theme">
            <svg class="sun-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" fill="#FFC107"/>
                <path d="M12 2V4M12 20V22M4 12H2M22 12H20M6.34 6.34L4.93 4.93M19.07 19.07L17.66 17.66M6.34 17.66L4.93 19.07M19.07 4.93L17.66 6.34" stroke="#FFC107" stroke-width="2"/>
            </svg>
            <svg class="moon-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3ZM12 19.5C7.85786 19.5 4.5 16.1421 4.5 12C4.5 7.85786 7.85786 4.5 12 4.5V19.5Z" fill="#FFC107"/>
            </svg>
        </button>
        <h1 class="website-name">VocabSwipe</h1>
        <h2 class="slogan">Swipe to Master Your Vocabulary!</h2>
        <p class="deck-version">Top 5000 Frequently Used Words</p>
        <div class="flashcard-container">
            <div class="flashcard">
                <div class="front">
                    <div class="word-container">
                        <h2 id="word"></h2>
                    </div>
                    <div class="meta-info">
                        <span id="front-rank" class="rank"></span>
                        <div class="frequency-container">
                            <span class="frequency-label">Frequency:</span>
                            <div class="frequency-bar">
                                <div id="front-frequency-fill" class="frequency-fill"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="back">
                    <div class="word-container">
                        <h2 id="back-word"></h2>
                    </div>
                    <div class="back-template">
                        <div class="card-info">
                            <p id="back-definition" class="definition"></p>
                            <p id="back-example" class="example"></p>
                        </div>
                        <div class="meta-info">
                            <span id="back-rank" class="rank"></span>
                            <div class="frequency-container">
                                <span class="frequency-label">Frequency:</span>
                                <div class="frequency-bar">
                                    <div id="back-frequency-fill" class="frequency-fill"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>
