const modes = ["Korean only", "Korean+English"];
let currentModeIndex = 0;
let mode = modes[currentModeIndex]; // Set initial mode

// Define elements globally so they are accessible throughout the script
const toggleModeButton = document.getElementById("toggle-mode-button");
const videoPlayer = document.getElementById("video-player");
const subtitleBlocksContainer = document.getElementById("subtitle-blocks");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const segmentCountInput = document.getElementById("segment-count");
const startIndexInput = document.getElementById("start-index");
const endIndexInput = document.getElementById("end-index");
const startButton = document.getElementById("start-button");
const searchResultsContainer = document.getElementById("search-results-container");
const searchPopup = document.getElementById("search-results");

let koreanSubtitles = [];
let englishSubtitles = [];
let segmentDirectory = ""; // Declare segmentDirectory in the global scope
toggleModeButton.textContent = `Mode: ${mode}`; // Display initial mode on the button

// Event listener to scroll through modes
toggleModeButton.addEventListener("click", () => {
    currentModeIndex = (currentModeIndex + 1) % modes.length;
    mode = modes[currentModeIndex];
    toggleModeButton.textContent = `Mode: ${mode}`;

    // Toggle visibility of English text boxes based on the selected mode
    const subtitleBlocks = subtitleBlocksContainer.querySelectorAll(".subtitle-block");

    subtitleBlocks.forEach((block) => {
        const englishBox = block.querySelector(".english-box");

        if (englishBox) {
            // Show or hide the English box based on the current mode
            englishBox.style.display = mode === "Korean+English" ? "block" : "none";
        }
    });

    // Update the popup subtitles if the popup is currently open
    const popupContainer = document.getElementById("popup-subtitle-container");
    if (popupContainer && popupContainer.style.display === 'block') {
        // Use current playback state to update the popup
        const startIndex = currentPlaybackStartIndex;
        const segmentCount = currentPlaybackSegmentCount;
        const currentSegment = currentPlaybackSegment;
        const currentIndex = startIndex + currentSegment;

        // Call updatePopUpDisplayedSubtitles to reflect the new mode in the popup
        updatePopUpDisplayedSubtitles(startIndex, segmentCount, currentSegment, currentIndex, startIndexHighlighted);
    }
});


// Function to create a subtitle block
function createSubtitleBlock(subtitleIndex) {
    const div = document.createElement("div");
    div.className = "subtitle-block";

    const indexBox = document.createElement("div");
    indexBox.className = "index-box";
    const timestamp = koreanSubtitles[subtitleIndex - 1]?.timestamp || "";
    indexBox.textContent = `${subtitleIndex} | ${timestamp}`;
    div.appendChild(indexBox);

    const koreanText = koreanSubtitles[subtitleIndex - 1]?.text || "";
    const koreanBox = document.createElement("div");
    koreanBox.className = "korean-box";
    koreanBox.textContent = koreanText;

    if (mode === "Korean+English") {
        const englishText = englishSubtitles[subtitleIndex - 1]?.text || "";
        const englishBox = document.createElement("div");
        englishBox.className = "english-box";
        englishBox.textContent = englishText;

        div.appendChild(koreanBox);
        div.appendChild(englishBox);
    } else {
        div.appendChild(koreanBox);
    }

    div.dataset.index = subtitleIndex;
    subtitleBlocksContainer.appendChild(div);
}

// Set default episode to 1
const episodeSelect = document.getElementById('episode-select');
episodeSelect.value = "1";
document.getElementById('episode-number').textContent = "1";

episodeSelect.addEventListener('change', function() {
    const episodeNum = this.value;
    document.getElementById('episode-number').textContent = episodeNum;

    // Update segmentDirectory based on the selected episode
    segmentDirectory = `segments\\Episode_${String(episodeNum).padStart(2, '0')}`;
    const subtitleFile = `Goblin_S01E${String(episodeNum).padStart(2, '0')}_Korean.srt`;

    // Fetch Korean and English subtitles
    fetch(subtitleFile)
        .then(response => response.ok ? response.text() : Promise.reject('Failed to fetch Korean subtitles'))
        .then(data => {
            koreanSubtitles = parseSRT(data); // Parse Korean subtitles
            koreanSubtitles.forEach(sub => createSubtitleBlock(sub.subtitleIndex)); // Create blocks for Korean subtitles only

            // Fetch English subtitles
            return fetch(subtitleFile.replace("_Korean.srt", "_Korean.en.srt"));
        })
        .then(response => response.ok ? response.text() : Promise.reject('Failed to fetch English subtitles'))
        .then(data => {
            englishSubtitles = parseSRT(data); // Parse English subtitles
            addClickListeners(); // Add listeners after both subtitle sets are loaded
        })
        .catch(error => {
            console.error('Error fetching or parsing subtitle files:', error);
            subtitleBlocksContainer.innerHTML = '<div>Failed to load subtitles.</div>';
        });

    // Function to parse SRT data into an array of subtitle objects
    function parseSRT(data) {
        const subtitles = [];
        const blocks = data.split(/\r?\n\r?\n/);
        blocks.forEach((block) => {
            const lines = block.trim().split(/\r?\n/);
            if (lines.length < 3) return;

            const subtitleIndex = parseInt(lines[0], 10);
            const timestamp = lines[1];
            const subtitleText = lines.slice(2).join(' ').trim();

            if (!isNaN(subtitleIndex) && timestamp.includes('-->') && subtitleText) {
                subtitles.push({ subtitleIndex, timestamp, text: subtitleText });
            }
        });
        return subtitles;
    }
});

// Manually trigger the change event to load episode 1 by default
episodeSelect.dispatchEvent(new Event('change'));


function updateVisibleSubtitleBlocks(startIndex, currentIndex, startIndexHighlighted) {
    const subtitleBlocks = subtitleBlocksContainer.querySelectorAll(".subtitle-block");

    subtitleBlocks.forEach((block) => {
        const index = parseInt(block.dataset.index, 10);
        const koreanText = koreanSubtitles[index - 1]?.text || "";
        const englishText = englishSubtitles[index - 1]?.text || "";
        const timestamp = koreanSubtitles[index - 1]?.timestamp || "";

        // Clear current content
        block.innerHTML = ""; 

        // Create and add the index and timestamp box
        const indexBox = document.createElement("div");
        indexBox.className = "index-box";
        indexBox.textContent = `${index} | ${timestamp}`;
        block.appendChild(indexBox);

        // Add Korean text in its own box
        const koreanBox = document.createElement("div");
        koreanBox.className = "korean-box";
        koreanBox.textContent = koreanText;
        block.appendChild(koreanBox);

        // Add English text in its own box, initially hidden if mode is "Korean only"
        const englishBox = document.createElement("div");
        englishBox.className = "english-box";
        englishBox.textContent = englishText;
        englishBox.style.display = mode === "Korean+English" ? "block" : "none"; // Hide if in "Korean only" mode
        block.appendChild(englishBox);

        // Highlight only if it's the startIndex initially or the currentIndex thereafter
        if ((!startIndexHighlighted && index === startIndex) || index === currentIndex) {
            block.classList.add("highlighted-subtitle");
        } else {
            block.classList.remove("highlighted-subtitle");
        }
    });
}


// Click listener to play segment based on clicked subtitle block's data-index
function addClickListeners() {
    subtitleBlocksContainer.addEventListener("click", (event) => {
        const block = event.target.closest(".subtitle-block");
        if (block) {
            const startIndex = parseInt(block.dataset.index, 10);

            // Set a default segment count for playback (you can adjust this as needed)
            let segmentCount = parseInt(segmentCountInput.value, 10);
            if (isNaN(segmentCount) || segmentCount < 1) segmentCount = 1;

            stopPlayback();
            playSegments(startIndex, segmentCount); // Start playing from the specific index
            updateDisplayedSubtitles(startIndex, segmentCount);
        }
    });
}

startButton.addEventListener("click", () => {
    const startIndex = parseInt(startIndexInput.value, 10);
    const endIndex = parseInt(endIndexInput.value, 10);

    // Ensure input values are valid before stopping any ongoing playback
    if (!isNaN(startIndex) && !isNaN(endIndex) && endIndex >= startIndex) {
        // Stop any ongoing playback before starting the new one
        stopPlayback();
        
        // Start playing the segments based on the provided indices
        playSegments(startIndex, endIndex - startIndex + 1);
        updateDisplayedSubtitles(startIndex, endIndex - startIndex + 1);
    } else {
        alert("Please enter valid Start and End indices.");
    }
});

//function search
searchButton.addEventListener("click", () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    searchResultsContainer.innerHTML = ''; // Clear previous search results

    // Filter koreanSubtitles based on the search term
    const filteredSubtitles = koreanSubtitles.filter(subtitle => 
        subtitle.text.toLowerCase().includes(searchTerm)
    );

    filteredSubtitles.forEach(subtitle => {
        const div = document.createElement("div");
        div.className = "search-result";
        
        // Display in the format "subtitleIndex: subtitle.text"
        div.textContent = `${subtitle.subtitleIndex}: ${subtitle.text}`;
        div.dataset.index = subtitle.subtitleIndex; // Correctly use subtitleIndex from parsed data
        
        // Click event to play from the selected search result
        div.addEventListener("click", () => {
            togglePopup(); // Close popup on click
            const startIndex = subtitle.subtitleIndex; // Start from the selected subtitle index
            let segmentCount = parseInt(segmentCountInput.value, 10);

            // Set a default segment count if input is invalid
            if (isNaN(segmentCount) || segmentCount < 5) segmentCount = 5;

            stopPlayback();
            startIndexHighlighted = false; // Reset to highlight startIndex initially

            // Start playback from selected search result and highlight
            playSegments(startIndex, segmentCount);
            updateDisplayedSubtitles(startIndex, segmentCount, 0, startIndex, startIndexHighlighted);
        });
        
        searchResultsContainer.appendChild(div);
    });

    if (!filteredSubtitles.length) {
        searchResultsContainer.innerHTML += '<div>No subtitles found.</div>';
    }
    togglePopup();
});

function togglePopup() {
    searchPopup.style.display = searchPopup.style.display === 'block' ? 'none' : 'block';
}

function playSegments(startIndex, count) {
    // Update playback state variables
    currentPlaybackStartIndex = startIndex;
    currentPlaybackSegmentCount = count;
    currentPlaybackSegment = 0; // Start from the first segment
    startIndexHighlighted = false;

    isPlayingSegments = true;
    const segmentFiles = [];

    for (let i = 0; i < count; i++) {
        segmentFiles.push(`${segmentDirectory}\\segment_${String(startIndex + i).padStart(3, '0')}.mp4`);
    }

    let currentSegment = 0;

    const playNextSegment = () => {
        if (currentSegment < segmentFiles.length) {
            currentPlaybackSegment = currentSegment; // Update the current segment being played
            const segmentFile = segmentFiles[currentSegment];
            videoPlayer.src = segmentFile;
            videoPlayer.load();

            videoPlayer.addEventListener("canplay", () => {
                videoPlayer.play().catch(error => console.error('Error playing the video:', error));
            }, { once: true });

            // Calculate the current index of the segment
            const currentIndex = startIndex + currentSegment;
            updateDisplayedSubtitles(startIndex, count, currentSegment, currentIndex, startIndexHighlighted);

            // Check if the popup is open and update the popup subtitles if it is
            const popupContainer = document.getElementById("popup-subtitle-container");
            if (popupContainer && popupContainer.style.display === 'block') {
                updatePopUpDisplayedSubtitles(startIndex, count, currentSegment, currentIndex, startIndexHighlighted);
            }

            if (!startIndexHighlighted) {
                startIndexHighlighted = true;
            }

            currentSegment++;
            videoPlayer.addEventListener('ended', playNextSegment, { once: true });
        } else {
            isPlayingSegments = false;
        }
    };

    playNextSegment();
}



function stopPlayback() {
    videoPlayer.pause();
    videoPlayer.src = "";
    isPlayingSegments = false;
}

function updateDisplayedSubtitles(startIndex, segmentCount, currentSegment = 0, currentIndex, startIndexHighlighted) {
    subtitleBlocksContainer.innerHTML = '';
    
    // Calculate the end index based on the startIndex and segmentCount
    const end = Math.min(koreanSubtitles.length - 1, startIndex + segmentCount - 2);

    // Loop through the range of subtitles to create blocks
    for (let i = startIndex - 1; i <= end; i++) {
        if (i >= 0 && i < koreanSubtitles.length) { // Ensure we are within the bounds of the array
            createSubtitleBlock(i + 1); // Adjust for display, using i + 1 to match user-friendly indexing
        }
    }

    // Pass startIndex and currentIndex, and the flag to determine if startIndex should be highlighted
    updateVisibleSubtitleBlocks(startIndex, currentIndex, startIndexHighlighted);
}

// Event listener for the reset button
        document.getElementById('reset-button').addEventListener('click', function() {
            location.reload(); // Refresh the page
        });

// Function to create or update the popup with subtitles
function updatePopUpDisplayedSubtitles(startIndex, segmentCount, currentSegment = 0, currentIndex, startIndexHighlighted) {
    let popupContainer = document.getElementById("popup-subtitle-container");

    // If the popup doesn't exist yet, create it
    if (!popupContainer) {
        popupContainer = document.createElement("div");
        popupContainer.id = "popup-subtitle-container";
        popupContainer.className = "popup-container";

        // Style the popup for better visibility and movement
        popupContainer.style.position = "absolute";
        popupContainer.style.top = "50px";
        popupContainer.style.left = "50px";
        popupContainer.style.backgroundColor = "white";
        popupContainer.style.border = "1px solid #ccc";
        popupContainer.style.padding = "10px";
        popupContainer.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
        popupContainer.style.cursor = "move";
        popupContainer.style.maxHeight = "400px";
        popupContainer.style.overflowY = "auto";
        popupContainer.style.zIndex = "1000";

        document.body.appendChild(popupContainer);
        
        // Add drag-and-drop functionality to make the popup movable
        makePopupDraggable(popupContainer);
    }

    // Clear existing content in the popup container
    popupContainer.innerHTML = '';

    // Calculate the end index based on the startIndex and segmentCount
    const end = Math.min(koreanSubtitles.length - 1, startIndex + segmentCount - 2);

    // Loop through the range of subtitles to create blocks and show only highlighted ones
    for (let i = startIndex - 1; i <= end; i++) {
        if (i >= 0 && i < koreanSubtitles.length) {
            if ((!startIndexHighlighted && i + 1 === startIndex) || i + 1 === currentIndex) {
                // Create only highlighted blocks
                const div = document.createElement("div");
                div.className = "highlighted-subtitle-block";

                const indexBox = document.createElement("div");
                indexBox.className = "index-box";
                const timestamp = koreanSubtitles[i]?.timestamp || "";
                indexBox.textContent = `${i + 1} | ${timestamp}`;
                div.appendChild(indexBox);

                const koreanText = koreanSubtitles[i]?.text || "";
                const koreanBox = document.createElement("div");
                koreanBox.className = "korean-box";
                koreanBox.textContent = koreanText;
                div.appendChild(koreanBox);

                if (mode === "Korean+English") {
                    const englishText = englishSubtitles[i]?.text || "";
                    const englishBox = document.createElement("div");
                    englishBox.className = "english-box";
                    englishBox.textContent = englishText;
                    div.appendChild(englishBox);
                }

                popupContainer.appendChild(div);
            }
        }
    }

    // Add double-click event listener to close the popup when double-clicking inside of it
    popupContainer.ondblclick = () => {
        popupContainer.style.display = 'none';
    };
}


// Function to make the popup draggable
function makePopupDraggable(popupElement) {
    let offsetX = 0, offsetY = 0, isDragging = false;

    popupElement.addEventListener('mousedown', (e) => {
        // Check if the target is the resize handle, if so, do nothing
        if (e.target.classList.contains('resize-handle')) return;

        isDragging = true;
        offsetX = e.clientX - popupElement.offsetLeft;
        offsetY = e.clientY - popupElement.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            popupElement.style.left = `${e.clientX - offsetX}px`;
            popupElement.style.top = `${e.clientY - offsetY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}


// Event listener for showing highlighted subtitles in popup
document.getElementById('show-highlighted-popup').addEventListener('click', () => {
    // Retrieve the current playback status variables
    const startIndex = currentPlaybackStartIndex;
    const segmentCount = currentPlaybackSegmentCount;
    const currentSegment = currentPlaybackSegment;
    const currentIndex = startIndex + currentSegment;

    // Ensure values are valid before updating the popup
    if (!isNaN(startIndex) && !isNaN(segmentCount)) {
        updatePopUpDisplayedSubtitles(startIndex, segmentCount, currentSegment, currentIndex, startIndexHighlighted);
        
        // Display the popup
        const popupContainer = document.getElementById('popup-subtitle-container');
        if (popupContainer) {
            popupContainer.style.display = 'block';
        }
    } else {
        alert("Please enter valid Start and Segment indices.");
    }
});