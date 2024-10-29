const modes = ["Korean only", "Korean+English"];
let currentModeIndex = 0;
let mode = modes[currentModeIndex]; // Set initial mode

// Define elements globally so they are accessible throughout the script
const popupContainer = document.getElementById("popup-subtitle-container");
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
const showHighlightedButton = document.getElementById("show-highlighted-popup");
const episodeSelect = document.getElementById('episode-select');
const searchResultsPopup = document.getElementById("search-results");
const dragHandle = document.getElementById("drag-handle");

// Global state variable for elaboration toggle
let offsetX = 0, offsetY = 0, startX = 0, startY = 0;
let isElaborationOn = false;
let koreanSubtitles = [];
let englishSubtitles = [];
let segmentDirectory = ""; // Declare segmentDirectory in the global scope
let isSubtitleHighlighted = false; // Track if highlighted subtitles are shown
toggleModeButton.querySelector("img").src = "/images/korean.svg"; // Set initial mode icon

// Set default episode to 1
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
            koreanSubtitles = parseSRT(data);
            koreanSubtitles.forEach(sub => createSubtitleBlock(sub.subtitleIndex));

            // Fetch English subtitles
            return fetch(subtitleFile.replace("_Korean.srt", "_Korean.en.srt"));
        })
        .then(response => response.ok ? response.text() : Promise.reject('Failed to fetch English subtitles'))
        .then(data => {
            englishSubtitles = parseSRT(data);
            addClickListeners(); // Add listeners after both subtitle sets are loaded
        })
        .catch(error => {
            console.error('Error fetching or parsing subtitle files:', error);
            subtitleBlocksContainer.innerHTML = '<div>Failed to load subtitles.</div>';
        });
    
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

toggleModeButton.addEventListener("click", () => {
    currentModeIndex = (currentModeIndex + 1) % modes.length;
    mode = modes[currentModeIndex];

    // Update button icon and alt text based on the current mode
    const modeImage = toggleModeButton.querySelector("img");
    if (mode === "Korean only") {
        modeImage.src = "/images/korean.svg";
        modeImage.alt = "Mode: Korean only";
    } else {
        modeImage.src = "/images/english.svg";
        modeImage.alt = "Mode: Korean + English";
    }

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
    if (popupContainer && popupContainer.style.display === 'block') {
        const startIndex = currentPlaybackStartIndex;
        const segmentCount = currentPlaybackSegmentCount;
        const currentSegment = currentPlaybackSegment;
        const currentIndex = startIndex + currentSegment;
        updatePopUpDisplayedSubtitles(startIndex, segmentCount, currentSegment, currentIndex, startIndexHighlighted);
    }
});

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

function addClickListeners() {
    subtitleBlocksContainer.addEventListener("click", (event) => {
        const block = event.target.closest(".subtitle-block");
        if (block) {
            const startIndex = parseInt(block.dataset.index, 10);
            let segmentCount = parseInt(segmentCountInput.value, 10);
            if (isNaN(segmentCount) || segmentCount < 1) segmentCount = 1;

            stopPlayback();
            playSegments(startIndex, segmentCount);
            updateDisplayedSubtitles(startIndex, segmentCount);
        }
    });
}

startButton.addEventListener("click", () => {
    const startIndex = parseInt(startIndexInput.value, 10);
    const endIndex = parseInt(endIndexInput.value, 10);

    if (!isNaN(startIndex) && !isNaN(endIndex) && endIndex >= startIndex) {
        stopPlayback();
        playSegments(startIndex, endIndex - startIndex + 1);
        updateDisplayedSubtitles(startIndex, endIndex - startIndex + 1);
    } else {
        alert("Please enter valid Start and End indices.");
    }
});

searchButton.addEventListener("click", () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    searchResultsContainer.innerHTML = '';
    const filteredSubtitles = koreanSubtitles.filter(subtitle => 
        subtitle.text.toLowerCase().includes(searchTerm)
    );

    filteredSubtitles.forEach(subtitle => {
        const div = document.createElement("div");
        div.className = "search-result";
        div.textContent = `${subtitle.subtitleIndex}: ${subtitle.text}`;
        div.dataset.index = subtitle.subtitleIndex;
        
        div.addEventListener("click", () => {
            togglePopup();
            const startIndex = subtitle.subtitleIndex;
            let segmentCount = parseInt(segmentCountInput.value, 10);

            if (isNaN(segmentCount) || segmentCount < 5) segmentCount = 5;

            stopPlayback();
            startIndexHighlighted = false;

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

showHighlightedButton.addEventListener("click", () => {
    isSubtitleHighlighted = !isSubtitleHighlighted;

    const subtitleImage = showHighlightedButton.querySelector("img");
    const subtitleBlocksContainer = document.getElementById("subtitle-blocks");

    if (isSubtitleHighlighted) {
        subtitleImage.src = "/images/subtitleon.svg";
        subtitleImage.alt = "Show Highlighted Subtitles";
        
        // Show subtitle blocks container
        subtitleBlocksContainer.style.display = 'block';
    } else {
        subtitleImage.src = "/images/subtitleoff.svg";
        subtitleImage.alt = "Hide Highlighted Subtitles";
        
        // Hide subtitle blocks container
        subtitleBlocksContainer.style.display = 'none';
    }
});

function playSegments(startIndex, count) {
    currentPlaybackStartIndex = startIndex;
    currentPlaybackSegmentCount = count;
    currentPlaybackSegment = 0;
    startIndexHighlighted = false;

    isPlayingSegments = true;
    const segmentFiles = [];

    for (let i = 0; i < count; i++) {
        segmentFiles.push(`${segmentDirectory}\\segment_${String(startIndex + i).padStart(3, '0')}.mp4`);
    }

    let currentSegment = 0;

    const playNextSegment = () => {
        if (currentSegment < segmentFiles.length) {
            currentPlaybackSegment = currentSegment;
            const segmentFile = segmentFiles[currentSegment];
            videoPlayer.src = segmentFile;
            videoPlayer.load();

            videoPlayer.addEventListener("canplay", () => {
                videoPlayer.play().catch(error => console.error('Error playing the video:', error));
            }, { once: true });

            const currentIndex = startIndex + currentSegment;
            updateDisplayedSubtitles(startIndex, count, currentSegment, currentIndex, startIndexHighlighted);

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
    const end = Math.min(koreanSubtitles.length - 1, startIndex + segmentCount - 2);

    for (let i = startIndex - 1; i <= end; i++) {
        if (i >= 0 && i < koreanSubtitles.length) {
            createSubtitleBlock(i + 1);
        }
    }

    updateVisibleSubtitleBlocks(startIndex, currentIndex, startIndexHighlighted);
}

function updateVisibleSubtitleBlocks(startIndex, currentIndex, startIndexHighlighted) {
    const subtitleBlocks = subtitleBlocksContainer.querySelectorAll(".subtitle-block");

    subtitleBlocks.forEach((block) => {
        const index = parseInt(block.dataset.index, 10);
        const koreanText = koreanSubtitles[index - 1]?.text || "";
        const englishText = englishSubtitles[index - 1]?.text || "";
        const timestamp = koreanSubtitles[index - 1]?.timestamp || "";

        block.innerHTML = "";

        const indexBox = document.createElement("div");
        indexBox.className = "index-box";
        indexBox.textContent = `${index} | ${timestamp}`;
        block.appendChild(indexBox);

        const koreanBox = document.createElement("div");
        koreanBox.className = "korean-box";
        koreanBox.textContent = koreanText;
        block.appendChild(koreanBox);

        const englishBox = document.createElement("div");
        englishBox.className = "english-box";
        englishBox.textContent = englishText;
        englishBox.style.display = mode === "Korean+English" ? "block" : "none";
        block.appendChild(englishBox);

        if ((!startIndexHighlighted && index === startIndex) || index === currentIndex) {
            block.classList.add("highlighted-subtitle");
            block.style.display = "block";
            block.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
            block.classList.remove("highlighted-subtitle");
            block.style.display = "none";
        }
    });
}

document.getElementById('reset-button').addEventListener('click', function() {
    location.reload();
});

// Function to update subtitles in the popup container as needed
function updatePopUpDisplayedSubtitles(startIndex, segmentCount, currentSegment = 0, currentIndex, startIndexHighlighted) {
    createOrSetPopupContainer(); // Ensure popupContainer is created and set up

    // Calculate the end index for subtitles to display
    const end = Math.min(koreanSubtitles.length - 1, startIndex + segmentCount - 2);

    // Loop through each subtitle to display, appending to the popup container
    for (let i = startIndex - 1; i <= end; i++) {
        if (i >= 0 && i < koreanSubtitles.length) {
            if ((!startIndexHighlighted && i + 1 === startIndex) || i + 1 === currentIndex) {
                const div = document.createElement("div");
                div.className = "highlighted-subtitle-block";

                const indexBox = document.createElement("div");
                indexBox.className = "index-box";
                const timestamp = koreanSubtitles[i]?.timestamp || "";
                indexBox.textContent = `${i + 1} | ${timestamp}`;
                div.appendChild(indexBox);

                const koreanBox = document.createElement("div");
                koreanBox.className = "korean-box";
                koreanBox.textContent = koreanSubtitles[i]?.text || "";
                div.appendChild(koreanBox);

                // Display English subtitle if in Korean+English mode
                if (mode === "Korean+English") {
                    const englishBox = document.createElement("div");
                    englishBox.className = "english-box";
                    englishBox.textContent = englishSubtitles[i]?.text || "";
                    div.appendChild(englishBox);
                }            
            }
        }
    }

    // Double-click to hide the popup
    popupContainer.ondblclick = () => {
        popupContainer.style.display = 'none';
    };
}

// Function to make the popup draggable
function makePopupDraggable(element) {
    let offsetX = 0, offsetY = 0, startX = 0, startY = 0;

    // Mouse down event to initialize dragging
    element.onmousedown = function(e) {
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        document.onmousemove = onMouseMove;
        document.onmouseup = stopDrag;
    };

    // Mouse move event to drag the element
    function onMouseMove(e) {
        e.preventDefault();
        offsetX = e.clientX - startX;
        offsetY = e.clientY - startY;
        startX = e.clientX;
        startY = e.clientY;
        element.style.top = (element.offsetTop + offsetY) + "px";
        element.style.left = (element.offsetLeft + offsetX) + "px";
    }

    // Mouse up event to stop dragging
    function stopDrag() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// Call this function to initialize or display the popup as needed
createOrSetPopupContainer();

document.addEventListener("DOMContentLoaded", () => {
    let isElaborationOn = false;

    document.getElementById("toggle-elaboration-button").addEventListener("click", () => {
        const popupContainer = document.getElementById("popup-subtitle-container");

        if (!popupContainer) {
            console.error("popup-subtitle-container element not found!");
            return;
        }

        isElaborationOn = !isElaborationOn;

        const elaborationImage = document.getElementById("toggle-elaboration-button").querySelector("img");

        if (isElaborationOn) {
            elaborationImage.src = "/images/elaborationon.svg";
            elaborationImage.alt = "Show Elaboration";

            const startIndex = parseInt(currentPlaybackStartIndex, 10);
            const segmentCount = parseInt(currentPlaybackSegmentCount, 10);

            if (!isNaN(startIndex) && !isNaN(segmentCount)) {
                updatePopupWithAllSubtitles(startIndex, segmentCount);
                popupContainer.style.display = "block";
            } else {
                console.warn("Invalid startIndex or segmentCount provided.");
            }
        } else {
            elaborationImage.src = "/images/elaborationoff.svg";
            elaborationImage.alt = "Hide Elaboration";
            popupContainer.style.display = "none";
        }
    });
});

// Function to create or set up the popup container and make it draggable
function createOrSetPopupContainer() {
    if (!popupContainer) {
        popupContainer = document.createElement("div");
        popupContainer.id = "popup-subtitle-container";
        popupContainer.className = "popup-container";

        // Style the popup container
        popupContainer.style.position = "absolute";
        popupContainer.style.top = "50px";
        popupContainer.style.left = "50px";
        popupContainer.style.backgroundColor = "white";
        popupContainer.style.border = "1px solid #ccc";
        popupContainer.style.padding = "20px";
        popupContainer.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
        popupContainer.style.cursor = "move";
        popupContainer.style.maxHeight = "400px";
        popupContainer.style.overflowY = "auto";
        popupContainer.style.zIndex = "1000";

        document.body.appendChild(popupContainer);
        makePopupDraggable(popupContainer); // Make the popup draggable
    }
}

function updatePopupWithAllSubtitles(startIndex, segmentCount) {
    const popupContainer = document.getElementById("popup-subtitle-container");
    if (popupContainer) {
        popupContainer.innerHTML = '';

        for (let i = startIndex - 1; i < startIndex + segmentCount - 1; i++) {
            if (i >= 0 && i < koreanSubtitles.length) {
                const subtitle = koreanSubtitles[i];
                const subtitleDiv = document.createElement("div");
                subtitleDiv.className = "highlighted-subtitle-block";
                
                const indexBox = document.createElement("div");
                indexBox.className = "index-box";
                indexBox.textContent = `${i + 1} | ${subtitle.timestamp}`;
                subtitleDiv.appendChild(indexBox);
                
                const koreanBox = document.createElement("div");
                koreanBox.className = "korean-box";
                koreanBox.textContent = subtitle.text;
                subtitleDiv.appendChild(koreanBox);

                if (mode === "Korean+English" && englishSubtitles[i]) {
                    const englishBox = document.createElement("div");
                    englishBox.className = "english-box";
                    englishBox.textContent = englishSubtitles[i].text;
                    subtitleDiv.appendChild(englishBox);
                }
                
                popupContainer.appendChild(subtitleDiv);
            }
        }
        
        popupContainer.style.display = 'block';

        popupContainer.addEventListener('dblclick', () => {
            popupContainer.style.display = 'none';
        });
    }
}


// Function to make the popup draggable
function makePopupDraggable(element) {
    let offsetX = 0, offsetY = 0, startX = 0, startY = 0;

    // Mouse down event to initialize dragging
    element.onmousedown = function(e) {
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        document.onmousemove = onMouseMove;
        document.onmouseup = stopDrag;
    };

    // Mouse move event to drag the element
    function onMouseMove(e) {
        e.preventDefault();
        offsetX = e.clientX - startX;
        offsetY = e.clientY - startY;
        startX = e.clientX;
        startY = e.clientY;
        element.style.top = (element.offsetTop + offsetY) + "px";
        element.style.left = (element.offsetLeft + offsetX) + "px";
    }

    // Mouse up event to stop dragging
    function stopDrag() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// Make the existing popup container draggable
makePopupDraggable(popupContainer);
makePopupDraggable(searchResultsPopup);
