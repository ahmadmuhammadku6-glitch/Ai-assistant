let prompt = document.querySelector("#prompt")
let chatContainer = document.querySelector(".chat-container")
let imageButton = document.querySelector("#image");
let imageButtonImg = imageButton.querySelector("img"); // Get the image inside button
let imageInput = document.querySelector("#image input")
let submitButton = document.querySelector("#submit");

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyCDaKxjAay3TpPZNAB-MTegAhiREthU3Gg"

let user = {
    message: null,
    file: {
        mime_type: null,
        data: null
    }
}

let stopGeneration = false;
let currentStopButton = null;
let currentTypingInterval = null;
let currentImageSelected = false;

// Format text with proper styling
function formatText(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/### (.*?)(?=\n|$)/g, '<h3>$1</h3>')
        .replace(/## (.*?)(?=\n|$)/g, '<h2>$1</h2>')
        .replace(/# (.*?)(?=\n|$)/g, '<h1>$1</h1>')
        .replace(/\n/g, '<br>')
        .replace(/\* (.*?)(?=\n|$)/g, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
        .replace(/---/g, '<hr>');
}

// Typing effect function
function typeText(element, text, speed = 30) {
    if (currentTypingInterval) {
        clearTimeout(currentTypingInterval);
        currentTypingInterval = null;
    }
    
    element.innerHTML = "";
    let i = 0;
    
    function typing() {
        if (stopGeneration) {
            stopGeneration = false;
            hideStopButton();
            currentTypingInterval = null;
            return;
        }
        
        if (i < text.length) {
            let currentText = text.substring(0, i + 1);
            element.innerHTML = formatText(currentText);
            i++;
            chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
            currentTypingInterval = setTimeout(typing, speed);
        } else {
            hideStopButton();
            currentTypingInterval = null;
        }
    }
    typing();
}

async function generatResponse(aiChatBox) {
    try {
        let text = aiChatBox.querySelector(".ai-chat-area")
        
        // Fixed: Create proper parts array for image with correct structure
        let parts = [];
        
        // Add text part if message exists
        if (user.message && user.message.trim()) {
            parts.push({"text": user.message});
        }
        
        // Add image part if image is selected - use temporary variable
        let hasImage = user.file.data !== null;
        if (hasImage) {
            parts.push({
                "inline_data": {
                    "mime_type": user.file.mime_type,
                    "data": user.file.data
                }
            });
        }
        
        // If no content, return
        if (parts.length === 0) {
            text.innerHTML = "Please provide a message or image.";
            return;
        }
        
        let requestOptions = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "contents": [{
                    "parts": parts
                }]
            })
        }
        
        showStopButton();
        
        let response = await fetch(API_URL, requestOptions)
        
        if (stopGeneration) {
            stopGeneration = false;
            hideStopButton();
            return;
        }
        
        let data = await response.json()
        
        if (stopGeneration) {
            stopGeneration = false;
            hideStopButton();
            return;
        }
        
        let apiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Sorry, no response received.";
        
        text.innerHTML = "";
        typeText(text, apiResponse);
        
    } catch(error) {
        console.log("Error generating response:", error);
        let text = aiChatBox.querySelector(".ai-chat-area");
        text.innerHTML = "Sorry, I encountered an error. Please try again.";
        hideStopButton();
    } finally {
        // Clear image after API call is complete
        clearImageAfterUse();
    }
}

function createChatBox(html, classes) {
    let div = document.createElement("div");
    div.innerHTML = html;
    div.classList.add(classes);
    return div;
}

// Add this function to clear the image after use
function clearImageAfterUse() {
    user.file = {
        mime_type: null,
        data: null
    };
    currentImageSelected = false;
    // Reset button image to default
    resetImageButton();
}

// Function to update image button with selected image
function updateImageButton(imageData) {
    imageButtonImg.src = `data:${user.file.mime_type};base64,${imageData}`;
    imageButtonImg.style.borderRadius = '50%';
    imageButtonImg.style.objectFit = 'cover';
    imageButtonImg.style.width = '45px';
    imageButtonImg.style.height = '45px';
}

// Function to reset image button to default
function resetImageButton() {
    imageButtonImg.src = 'img (2).png';
    imageButtonImg.style.borderRadius = '0';
    imageButtonImg.style.objectFit = 'contain';
    imageButtonImg.style.width = '25px';
    imageButtonImg.style.height = 'auto';
}

function handlechatResponse(usermessage) {
    if (!usermessage.trim() && !currentImageSelected) return;
    
    user.message = usermessage;
    
    let imageHtml = currentImageSelected && user.file.data ? 
        `<div class="image-container">
            <img src="data:${user.file.mime_type};base64,${user.file.data}" class="chooseing"/>
        </div>` : "";
    
    let html = ` 
        <img id="user-img" src="user.png" alt="" width="65">
        <div class="user-chat-area">
            ${user.message}
            ${imageHtml}
        </div> 
    `; 
    prompt.value = "";
    
    let userChatBox = createChatBox(html, "user-chat-box");
    chatContainer.appendChild(userChatBox);

    setTimeout(() => {
        let html = `
            <img src="ai.png" alt="" id="ai-img" width="65">
            <div class="ai-chat-area">
                <div class="loading-spinner"></div>
            </div>
        `;
        let aiChatBox = createChatBox(html, "ai-chat-box");
        chatContainer.appendChild(aiChatBox);
        
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
        generatResponse(aiChatBox);
    }, 600);
}

// Show stop button in prompt area
function showStopButton() {
    if (!currentStopButton) {
        currentStopButton = document.createElement('button');
        currentStopButton.className = 'stop-button';
        currentStopButton.innerHTML = '⏹';
        currentStopButton.title = 'Stop Response';
        
        currentStopButton.addEventListener('click', () => {
            stopGeneration = true;
            currentStopButton.disabled = true;
            currentStopButton.innerHTML = '⏹';
            
            if (currentTypingInterval) {
                clearTimeout(currentTypingInterval);
                currentTypingInterval = null;
            }
        });
        
        const promptContainer = prompt.parentElement;
        promptContainer.appendChild(currentStopButton);
    }
    currentStopButton.style.display = 'flex';
    currentStopButton.disabled = false;
    stopGeneration = false;
}

// Hide stop button
function hideStopButton() {
    if (currentStopButton) {
        currentStopButton.style.display = 'none';
        currentStopButton.disabled = false;
        stopGeneration = false;
    }
}

// Keep prompt input always active and focused
function maintainFocus() {
    prompt.focus();
    prompt.addEventListener("blur", function() {
        setTimeout(() => {
            if (document.activeElement !== prompt) {
                prompt.focus();
            }
        }, 10);
    });
}

// Initialize focus
maintainFocus();

// Enter key functionality
prompt.addEventListener("keydown", (e) => {
    if (e.key == "Enter") {
        handlechatResponse(prompt.value);
    } 
});

// Submit button functionality
if (submitButton) {
    submitButton.addEventListener("click", () => {
        handlechatResponse(prompt.value);
    });
}

imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;
    
    let reader = new FileReader();
    reader.onload = (e) => {
        let Base64string = e.target.result.split(",")[1];
        user.file = {
            mime_type: file.type,
            data: Base64string
        };
        currentImageSelected = true;
        
        // Update image button with selected image
        updateImageButton(Base64string);
        
        imageInput.value = "";
    };
    reader.readAsDataURL(file);
});

imageButton.addEventListener("click", () => {
    imageInput.click();
});

// Add CSS for proper formatting and copy functionality
const style = document.createElement('style');
style.textContent = `
    .image-container {
        max-width: 100%;
        margin-top: 10px;
    }
    
    .chooseing {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        object-fit: contain;
    }
    
    .user-chat-area {
        word-wrap: break-word;
        overflow-wrap: break-word;
        max-width: 100%;
    }
    
    .ai-chat-area {
        word-wrap: break-word;
        overflow-wrap: break-word;
        max-width: 100%;
        line-height: 1.6;
        user-select: text !important;
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        cursor: text;
    }
    
    .ai-chat-area h1 {
        font-size: 1.5em;
        font-weight: bold;
        margin: 10px 0;
        color: #2c3e50;
    }
    
    .ai-chat-area h2 {
        font-size: 1.3em;
        font-weight: bold;
        margin: 8px 0;
        color: #34495e;
    }
    
    .ai-chat-area h3 {
        font-size: 1.1em;
        font-weight: bold;
        margin: 6px 0;
        color: #34495e;
    }
    
    .ai-chat-area strong {
        font-weight: bold;
        color: #2c3e50;
    }
    
    .ai-chat-area em {
        font-style: italic;
    }
    
    .ai-chat-area ul {
        margin: 8px 0;
        padding-left: 20px;
    }
    
    .ai-chat-area li {
        margin: 4px 0;
        list-style-type: disc;
    }
    
    .ai-chat-area hr {
        border: none;
        border-top: 1px solid #ddd;
        margin: 15px 0;
    }
    
    .stop-button {
        background: #ff0000 !important;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        width: 40px;
        height: 40px;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        margin-left: 10px;
    }
    
    .stop-button:hover {
        background: #cc0000 !important;
    }
    
    .stop-button:disabled {
        background: #999999 !important;
        cursor: not-allowed;
    }
    
    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        display: inline-block;
        vertical-align: middle;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); } 
    }
    
    /* Make AI responses selectable */
    .ai-chat-area * {
        user-select: text !important;
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
    }
`;
document.head.appendChild(style);

// Add copy functionality to AI responses
function addCopyFunctionality() {
    // Add click event listener to chat container
    chatContainer.addEventListener('click', function(e) {
        // Check if click is on AI chat area
        if (e.target.closest('.ai-chat-area')) {
            const aiChatArea = e.target.closest('.ai-chat-area');
            const textToCopy = aiChatArea.innerText || aiChatArea.textContent;
            
            // Copy to clipboard
            navigator.clipboard.writeText(textToCopy).then(() => {
                // Show copy feedback
                showCopyFeedback(aiChatArea);
            }).catch(err => {
                console.error('Copy failed:', err);
            });
        }
    });
}

// Function to show copy feedback
function showCopyFeedback(element) {
    const originalBackground = element.style.backgroundColor;
    
    // Highlight effect
    element.style.backgroundColor = '#e8f5e8';
    element.style.transition = 'background-color 0.3s ease';
    
    // Reset background after 1 second
    setTimeout(() => {
        element.style.backgroundColor = originalBackground;
    }, 1000);
}

// Initialize copy functionality
addCopyFunctionality();