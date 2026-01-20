// ===== AI Flow - Pollinations AI Integration =====
// DEBUG: Console logging enabled

class AIFlow {
    constructor() {
        console.log('%c[AIFlow] 🚀 Initializing AIFlow application...', 'color: #8b5cf6; font-weight: bold; font-size: 14px;');
        
        // API Configuration
        this.apiKey = localStorage.getItem('pollinations_api_key') || '';
        this.imgbbApiKey = localStorage.getItem('imgbb_api_key') || '';
        this.settings = this.loadSettings();
        console.log('[AIFlow] ⚙️ Settings loaded:', this.settings);
        console.log('[AIFlow] 🔑 API Key:', this.apiKey ? '***' + this.apiKey.slice(-4) : 'NOT SET');
        
        // API Endpoints
        this.endpoints = {
            image: 'https://image.pollinations.ai/prompt/',
            video: 'https://gen.pollinations.ai/video/',
            text: 'https://text.pollinations.ai/'
        };
        console.log('[AIFlow] 🌐 Endpoints configured:', this.endpoints);
        
        // State
        this.currentTab = 'image';
        this.gallery = this.loadGallery();
        this.chatHistory = [];
        this.isGenerating = false;
        this.scenes = []; // For video chaining
        this.lastVideoBlob = null; // Last generated video blob
        console.log('[AIFlow] 📊 Initial state:', {
            currentTab: this.currentTab,
            galleryItems: this.gallery.length,
            isGenerating: this.isGenerating,
            scenes: this.scenes.length
        });
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log('[AIFlow] 🔧 Running init()...');
        this.bindEvents();
        this.renderGallery();
        this.updateCharCounts();
        console.log('%c[AIFlow] ✅ Initialization complete!', 'color: #22c55e; font-weight: bold;');
    }
    
    // ===== Settings Management =====
    loadSettings() {
        console.log('[AIFlow] 📂 Loading settings from localStorage...');
        const defaults = {
            imageModel: 'flux',
            videoModel: 'seedance-pro',
            textModel: 'openai'
        };
        const saved = localStorage.getItem('pollinations_settings');
        const result = saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        console.log('[AIFlow] 📂 Settings result:', result);
        return result;
    }

    async uploadImageToImgBB(base64Image) {
        if (!this.imgbbApiKey) {
            throw new Error('ImgBB API Key is missing');
        }

        // Remove header if present (data:image/jpeg;base64,)
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

        const formData = new FormData();
        formData.append("image", base64Data);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${this.imgbbApiKey}`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`ImgBB API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.data.url;
    }
    
    saveSettings() {
        console.log('[AIFlow] 💾 Saving settings...', this.settings);
        localStorage.setItem('pollinations_settings', JSON.stringify(this.settings));
        localStorage.setItem('pollinations_api_key', this.apiKey);
        localStorage.setItem('imgbb_api_key', this.imgbbApiKey);
        console.log('[AIFlow] 💾 Settings saved to localStorage');
        this.showToast('Settings saved successfully!', 'success');
    }
    
    // ===== Gallery Management =====
    loadGallery() {
        const saved = localStorage.getItem('ai_flow_gallery');
        return saved ? JSON.parse(saved) : [];
    }
    
    saveGallery() {
        localStorage.setItem('ai_flow_gallery', JSON.stringify(this.gallery));
    }
    
    addToGallery(item) {
        this.gallery.unshift({
            id: Date.now(),
            ...item,
            createdAt: new Date().toISOString()
        });
        this.saveGallery();
        this.renderGallery();
    }
    
    clearGallery() {
        if (confirm('Are you sure you want to clear all gallery items?')) {
            this.gallery = [];
            this.saveGallery();
            this.renderGallery();
            this.showToast('Gallery cleared', 'success');
        }
    }
    
    // ===== Image Generation =====
    async generateImage(prompt) {
        console.log('[AIFlow] 🖼️ generateImage called with prompt:', prompt);
        
        if (this.isGenerating) {
            console.warn('[AIFlow] ⚠️ Already generating, ignoring request');
            return;
        }
        if (!prompt.trim()) {
            console.warn('[AIFlow] ⚠️ Empty prompt, ignoring request');
            return;
        }
        
        this.isGenerating = true;
        console.log('[AIFlow] 🖼️ isGenerating set to true');
        
        const previewArea = document.getElementById('imagePreview');
        const generateBtn = document.getElementById('generateImageBtn');
        
        // Show loading
        generateBtn.disabled = true;
        previewArea.innerHTML = '<div class="loading-shimmer"></div>';
        console.log('[AIFlow] 🖼️ Loading state displayed');
        
        // Build URL with parameters
        const encodedPrompt = encodeURIComponent(prompt.trim());
        const model = this.settings.imageModel;
        let url = `${this.endpoints.image}${encodedPrompt}?model=${model}&width=1024&height=1024&nologo=true&seed=${Date.now()}`;
        
        // Add token if API key exists
        if (this.apiKey) {
            url += `&token=${this.apiKey}`;
            console.log('[AIFlow] 🖼️ API token appended to URL');
        }
        
        console.log('[AIFlow] 🖼️ Request URL:', url);
        console.log('[AIFlow] 🖼️ Using model:', model);
        
        // Create image element
        const img = document.createElement('img');
        img.alt = prompt;
        
        // Set up handlers before setting src
        img.onload = () => {
            console.log('%c[AIFlow] ✅ Image loaded successfully!', 'color: #22c55e; font-weight: bold;');
            console.log('[AIFlow] 🖼️ Image dimensions:', img.naturalWidth, 'x', img.naturalHeight);
            previewArea.innerHTML = '';
            previewArea.appendChild(img);
            img.onclick = () => this.openImageModal(img.src, prompt);
            
            // Add to gallery
            this.addToGallery({
                type: 'image',
                url: img.src,
                prompt: prompt
            });
            
            this.showToast('Image generated successfully!', 'success');
            this.isGenerating = false;
            generateBtn.disabled = false;
            console.log('[AIFlow] 🖼️ Generation complete, isGenerating set to false');
        };
        
        img.onerror = (error) => {
            console.error('%c[AIFlow] ❌ Image generation error!', 'color: #ef4444; font-weight: bold;');
            console.error('[AIFlow] ❌ Error details:', error);
            console.error('[AIFlow] ❌ Failed URL:', url);
            previewArea.innerHTML = `
                <div class="preview-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>Error generating image</p>
                    <small style="opacity: 0.7;">Check your API key or try a different prompt</small>
                </div>
            `;
            this.showToast('Failed to generate image', 'error');
            this.isGenerating = false;
            generateBtn.disabled = false;
            console.log('[AIFlow] 🖼️ Error handled, isGenerating set to false');
        };
        
        // Start loading
        console.log('[AIFlow] 🖼️ Starting image load...');
        img.src = url;
    }
    
    // ===== Text/Chat Generation =====
    async sendChatMessage(message) {
        console.log('[AIFlow] 💬 sendChatMessage called with:', message);
        
        if (this.isGenerating) {
            console.warn('[AIFlow] ⚠️ Already generating, ignoring chat request');
            return;
        }
        if (!message.trim()) {
            console.warn('[AIFlow] ⚠️ Empty message, ignoring chat request');
            return;
        }
        
        this.isGenerating = true;
        console.log('[AIFlow] 💬 Chat isGenerating set to true');
        
        const chatMessages = document.getElementById('chatMessages');
        const sendBtn = document.getElementById('sendChatBtn');
        const input = document.getElementById('chatInput');
        
        sendBtn.disabled = true;
        input.value = '';
        
        // Add user message
        this.addChatMessage(message, 'user');
        console.log('[AIFlow] 💬 User message added to chat');
        
        // Add typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">AI</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        console.log('[AIFlow] 💬 Typing indicator displayed');
        
        try {
            const encodedPrompt = encodeURIComponent(message.trim());
            let url = `${this.endpoints.text}${encodedPrompt}`;
            
            if (this.apiKey) {
                url += `?token=${this.apiKey}`;
                console.log('[AIFlow] 💬 API token appended to URL');
            }
            
            console.log('[AIFlow] 💬 Sending request to:', url);
            const response = await fetch(url);
            console.log('[AIFlow] 💬 Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`Failed to get response: ${response.status}`);
            }
            
            const text = await response.text();
            console.log('[AIFlow] 💬 Response text length:', text.length);
            
            // Remove typing indicator
            document.getElementById('typingIndicator')?.remove();
            
            // Add AI response
            this.addChatMessage(text, 'ai');
            console.log('%c[AIFlow] ✅ Chat response received successfully!', 'color: #22c55e; font-weight: bold;');
            
            this.chatHistory.push({ role: 'user', content: message });
            this.chatHistory.push({ role: 'assistant', content: text });
            console.log('[AIFlow] 💬 Chat history updated, total messages:', this.chatHistory.length);
            
        } catch (error) {
            console.error('%c[AIFlow] ❌ Chat error!', 'color: #ef4444; font-weight: bold;');
            console.error('[AIFlow] ❌ Error details:', error);
            document.getElementById('typingIndicator')?.remove();
            this.addChatMessage('Sorry, I encountered an error. Please try again.', 'ai');
            this.showToast('Failed to get response', 'error');
        }
        
        this.isGenerating = false;
        sendBtn.disabled = false;
        console.log('[AIFlow] 💬 Chat complete, isGenerating set to false');
    }
    
    addChatMessage(content, type) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${type === 'ai' ? 'AI' : 'You'}</div>
            <div class="message-content">
                <p>${this.escapeHtml(content)}</p>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // ===== Video Generation =====
    async generateVideo(prompt) {
        console.log('[AIFlow] 🎬 generateVideo called with prompt:', prompt);
        
        if (this.isGenerating) {
            console.warn('[AIFlow] ⚠️ Already generating, ignoring video request');
            return;
        }
        if (!prompt.trim()) {
            console.warn('[AIFlow] ⚠️ Empty prompt, ignoring video request');
            return;
        }
        
        this.isGenerating = true;
        console.log('[AIFlow] 🎬 Video isGenerating set to true');
        
        const previewArea = document.getElementById('videoPreview');
        const generateBtn = document.getElementById('generateVideoBtn');
        
        console.log('[AIFlow] 🎬 Preview area:', previewArea);
        console.log('[AIFlow] 🎬 Generate button:', generateBtn);
        
        generateBtn.disabled = true;
        previewArea.innerHTML = `
            <div class="preview-placeholder">
                <div class="loading-shimmer" style="position: absolute; inset: 0;"></div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="z-index: 1;">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="M10 9l5 3-5 3V9z"/>
                </svg>
                <p style="z-index: 1;">Generating video... This may take 1-3 minutes</p>
                <small style="z-index: 1; opacity: 0.7;">Video generation requires API key for best results</small>
            </div>
        `;
        console.log('[AIFlow] 🎬 Loading state displayed');
        
        try {
            const model = this.settings.videoModel;
            const encodedPrompt = encodeURIComponent(prompt.trim());
            
            // Set max duration based on model (veo: 4/6/8, seedance: 2-10)
            let duration;
            if (model === 'veo') {
                duration = 8; // Max for veo
            } else {
                duration = 10; // Max for seedance/seedance-pro
            }
            
            // Video generation uses gen.pollinations.ai/image/ endpoint with video models
            // Using ?key= query param for authentication (more reliable for CORS)
            let videoUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${model}&duration=${duration}`;
            
            // Add API key as query parameter
            if (this.apiKey) {
                videoUrl += `&key=${this.apiKey}`;
                console.log('[AIFlow] 🎬 API key added to URL');
            } else {
                console.warn('[AIFlow] ⚠️ No API key set - video generation will fail!');
            }
            
            console.log('[AIFlow] 🎬 Request URL:', videoUrl.replace(this.apiKey, '***'));
            console.log('[AIFlow] 🎬 Using model:', model, 'duration:', duration, 'seconds');
            console.log('[AIFlow] 🎬 Fetching video...');
            
            // Fetch video as blob to handle CORS and loading properly
            const response = await fetch(videoUrl);
            console.log('[AIFlow] 🎬 Response status:', response.status);
            console.log('[AIFlow] 🎬 Response content-type:', response.headers.get('content-type'));
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('[AIFlow] ❌ Video API error response:', errorText);
                throw new Error(`Video API error: ${response.status} - ${errorText.substring(0, 100)}`);
            }
            
            console.log('[AIFlow] 🎬 Converting response to blob...');
            const blob = await response.blob();
            console.log('[AIFlow] 🎬 Blob size:', blob.size, 'bytes, type:', blob.type);
            const blobUrl = URL.createObjectURL(blob);
            console.log('[AIFlow] 🎬 Blob URL created:', blobUrl);
            
            const video = document.createElement('video');
            video.controls = true;
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.src = blobUrl;
            
            previewArea.innerHTML = '';
            previewArea.appendChild(video);
            console.log('[AIFlow] 🎬 Video element added to preview');
            
            // Save to scenes for chaining
            this.lastVideoBlob = blob;
            this.addScene(blob, blobUrl, prompt);
            
            this.addToGallery({
                type: 'video',
                url: blobUrl,
                prompt: prompt
            });
            
            this.showToast('Video generated successfully!', 'success');
            console.log('%c[AIFlow] ✅ Video generated successfully!', 'color: #22c55e; font-weight: bold;');
            this.isGenerating = false;
            generateBtn.disabled = false;
            
        } catch (error) {
            console.error('%c[AIFlow] ❌ Video generation error!', 'color: #ef4444; font-weight: bold;');
            console.error('[AIFlow] ❌ Error details:', error);
            console.error('[AIFlow] ❌ Error message:', error.message);
            previewArea.innerHTML = `
                <div class="preview-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>Error generating video</p>
                    <small style="opacity: 0.7;">${this.escapeHtml(error.message)}</small>
                    <small style="opacity: 0.5;">Try adding an API key in Settings</small>
                </div>
            `;
            this.showToast('Failed to generate video', 'error');
            this.isGenerating = false;
            generateBtn.disabled = false;
            console.log('[AIFlow] 🎬 Error handled, isGenerating set to false');
        }
    }
    
    // ===== Gallery Rendering =====
    renderGallery(filter = 'all') {
        const grid = document.getElementById('galleryGrid');
        const items = filter === 'all' 
            ? this.gallery 
            : this.gallery.filter(item => item.type === filter);
        
        if (items.length === 0) {
            grid.innerHTML = `
                <div class="gallery-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <line x1="12" y1="8" x2="12" y2="16"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    <p>No media yet. Start generating!</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = items.map(item => `
            <div class="gallery-item" data-id="${item.id}" data-type="${item.type}">
                ${item.type === 'image' 
                    ? `<img class="gallery-item-media" src="${item.url}" alt="${this.escapeHtml(item.prompt)}" loading="lazy">`
                    : `<video class="gallery-item-media" src="${item.url}" muted loop></video>`
                }
                <div class="gallery-item-info">
                    <p class="gallery-item-prompt">${this.escapeHtml(item.prompt)}</p>
                    <div class="gallery-item-meta">
                        <span class="gallery-item-type">${item.type}</span>
                        <span>${this.formatDate(item.createdAt)}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        grid.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id);
                const galleryItem = this.gallery.find(g => g.id === id);
                if (galleryItem) {
                    if (galleryItem.type === 'image') {
                        this.openImageModal(galleryItem.url, galleryItem.prompt);
                    }
                }
            });
            
            // Video hover play
            const video = item.querySelector('video');
            if (video) {
                item.addEventListener('mouseenter', () => video.play());
                item.addEventListener('mouseleave', () => {
                    video.pause();
                    video.currentTime = 0;
                });
            }
        });
    }
    
    // ===== Image Modal =====
    openImageModal(url, prompt) {
        const modal = document.getElementById('imageModal');
        const modalImage = document.getElementById('modalImage');
        
        modalImage.src = url;
        modalImage.alt = prompt;
        modal.classList.add('active');
        
        // Set up download
        document.getElementById('downloadImage').onclick = () => {
            this.downloadImage(url, prompt);
        };
    }
    
    closeImageModal() {
        document.getElementById('imageModal').classList.remove('active');
    }
    
    async downloadImage(url, prompt) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `ai-flow-${prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
            
            this.showToast('Image downloaded!', 'success');
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Failed to download image', 'error');
        }
    }
    
    // ===== UI Helpers =====
    switchTab(tabName) {
        console.log('%c[AIFlow] 📍 switchTab called with:', 'color: #f59e0b; font-weight: bold;', tabName);
        console.log('[AIFlow] 📍 Previous tab:', this.currentTab);
        
        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            const isActive = item.dataset.tab === tabName;
            item.classList.toggle('active', isActive);
            if (isActive) {
                console.log('[AIFlow] 📍 Nav item activated:', item.dataset.tab);
            }
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(tab => {
            const isActive = tab.id === `tab-${tabName}`;
            tab.classList.toggle('active', isActive);
            if (isActive) {
                console.log('[AIFlow] 📍 Tab content activated:', tab.id);
            }
        });
        
        this.currentTab = tabName;
        console.log('[AIFlow] 📍 Current tab updated to:', this.currentTab);
    }
    
    updateCharCounts() {
        const imagePrompt = document.getElementById('imagePrompt');
        const videoPrompt = document.getElementById('videoPrompt');
        const imageCount = document.getElementById('imageCharCount');
        const videoCount = document.getElementById('videoCharCount');
        
        if (imagePrompt && imageCount) {
            imagePrompt.addEventListener('input', () => {
                imageCount.textContent = imagePrompt.value.length;
            });
        }
        
        if (videoPrompt && videoCount) {
            videoPrompt.addEventListener('input', () => {
                videoCount.textContent = videoPrompt.value.length;
            });
        }
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // ===== Scenes (Video Chaining) =====
    addScene(blob, blobUrl, prompt) {
        console.log('[AIFlow] 🎬 Adding scene:', prompt.substring(0, 30) + '...');
        
        // Extract last frame as thumbnail
        this.extractLastFrame(blobUrl).then(thumbnailUrl => {
            const scene = {
                id: Date.now(),
                blob: blob,
                blobUrl: blobUrl,
                prompt: prompt,
                thumbnail: thumbnailUrl,
                createdAt: new Date().toISOString()
            };
            
            this.scenes.push(scene);
            this.renderScenes();
            console.log('[AIFlow] 🎬 Scene added, total scenes:', this.scenes.length);
        });
    }
    
    async extractLastFrame(videoUrl) {
        console.log('[AIFlow] 🎬 Extracting last frame from video...');
        
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.src = videoUrl;
            video.muted = true;
            
            video.onloadedmetadata = () => {
                // Seek to last frame (duration - small offset)
                // Using 0.2s padding to avoid black frames at the very end
                const seekTime = Math.max(0, video.duration - 0.2);
                console.log(`[AIFlow] 🎬 Seeking to ${seekTime}s (duration: ${video.duration}s)`);
                video.currentTime = seekTime;
            };
            
            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);
                
                const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
                console.log('[AIFlow] 🎬 Last frame extracted');
                resolve(thumbnailUrl);
            };
            
            video.onerror = () => {
                console.warn('[AIFlow] ⚠️ Could not extract frame, using placeholder');
                resolve('');
            };
        });
    }
    
    renderScenes() {
        const scenesList = document.getElementById('scenesList');
        const continueInput = document.getElementById('continueSceneInput');
        
        if (this.scenes.length === 0) {
            scenesList.innerHTML = `
                <div class="scenes-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                        <path d="M10 9l5 3-5 3V9z"/>
                    </svg>
                    <p>Generate a video first, then continue it here</p>
                </div>
            `;
            continueInput.classList.add('hidden');
            return;
        }
        
        scenesList.innerHTML = this.scenes.map((scene, index) => `
            <div class="scene-item" data-id="${scene.id}">
                <img class="scene-thumbnail" src="${scene.thumbnail || ''}" alt="Scene ${index + 1}">
                <div class="scene-info">
                    <p>Scene ${index + 1}: ${this.escapeHtml(scene.prompt.substring(0, 50))}...</p>
                    <small>${this.formatDate(scene.createdAt)}</small>
                </div>
                <div class="scene-actions">
                    <button class="btn btn-secondary" onclick="window.aiFlow.playScene(${scene.id})">▶</button>
                </div>
            </div>
        `).join('');
        
        continueInput.classList.remove('hidden');
    }
    
    playScene(sceneId) {
        const scene = this.scenes.find(s => s.id === sceneId);
        if (!scene) return;
        
        const previewArea = document.getElementById('videoPreview');
        const video = document.createElement('video');
        video.controls = true;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.src = scene.blobUrl;
        
        previewArea.innerHTML = '';
        previewArea.appendChild(video);
        console.log('[AIFlow] 🎬 Playing scene:', scene.id);
    }
    
    async continueVideo(prompt) {
        if (this.scenes.length === 0) {
            this.showToast('Generate a video first!', 'error');
            return;
        }
        
        if (this.isGenerating) {
            console.warn('[AIFlow] ⚠️ Already generating, ignoring request');
            return;
        }
        
        const lastScene = this.scenes[this.scenes.length - 1];
        const lastFrameUrl = lastScene.thumbnail;
        
        if (!lastFrameUrl) {
            this.showToast('Could not extract last frame', 'error');
            return;
        }
        
        console.log('[AIFlow] 🎬 Continuing video with last frame as input...');
        console.log('[AIFlow] 🎬 Continue prompt:', prompt);
        
        // Generate video with image parameter (image-to-video)
        this.isGenerating = true;
        const previewArea = document.getElementById('videoPreview');
        const generateBtn = document.getElementById('continueSceneBtn');
        
        generateBtn.disabled = true;
        previewArea.innerHTML = `
            <div class="preview-placeholder">
                <div class="loading-shimmer" style="position: absolute; inset: 0;"></div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="z-index: 1;">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="M10 9l5 3-5 3V9z"/>
                </svg>
                <p style="z-index: 1;">Continuing video... This may take 1-3 minutes</p>
            </div>
        `;
        
        try {
            const model = this.settings.videoModel === 'veo' ? 'seedance' : this.settings.videoModel;
            
            // Construct contextual prompt
            const previousContext = lastScene.prompt ? `(Previous action: ${lastScene.prompt}) ` : '';
            const inertiaInstruction = "Maintain momentum, speed, and visual style from previous action. seamlessly continue the motion.";
            const fullPrompt = `${previousContext}${prompt.trim()}. ${inertiaInstruction}`;
            
            console.log('[AIFlow] 🧠 Contextual Prompt:', fullPrompt);
            
            const encodedPrompt = encodeURIComponent(fullPrompt);
            const lastFrame = lastFrameUrl; // Define lastFrame for upload logic

            
            // Seedance supports image parameter for image-to-video
            // First upload image to ImgBB to get a short URL
            let imageUrl = '';
            
            try {
                this.showToast('Uploading reference frame...', 'info');
                imageUrl = await this.uploadImageToImgBB(lastFrame);
                console.log('[AIFlow] 📤 Image uploaded to ImgBB:', imageUrl);
            } catch (error) {
                console.error('[AIFlow] ❌ ImgBB upload failed:', error);
                this.showToast('Failed to upload reference frame. Check ImgBB API Key.', 'error');
                throw new Error('Image upload failed. Cannot continue video without valid reference image.');
            }

            const encodedImageUrl = encodeURIComponent(imageUrl);
            
            // Seedance supports image parameter for image-to-video
            let videoUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${model}&duration=10&image=${encodedImageUrl}`;
            
            if (this.apiKey) {
                videoUrl += `&key=${this.apiKey}`;
            }
            
            console.log('[AIFlow] 🎬 Continue URL (image-to-video):', videoUrl.replace(this.apiKey, '***').substring(0, 200) + '...');
            
            const response = await fetch(videoUrl);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error: ${response.status}`);
            }
            
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            // Save to scenes (but don't display individual video)
            this.lastVideoBlob = blob;
            this.addScene(blob, blobUrl, prompt);
            
            this.addToGallery({
                type: 'video',
                url: blobUrl,
                prompt: prompt
            });
            
            document.getElementById('continuePrompt').value = '';
            this.showToast('Video generated! Merging scenes...', 'success');
            
            // Immediately merge all scenes into one video
            await this.mergeAndPlayScenes();
            
        } catch (error) {
            console.error('[AIFlow] ❌ Continue video error:', error);
            previewArea.innerHTML = `
                <div class="preview-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>Error continuing video</p>
                    <small style="opacity: 0.7;">${this.escapeHtml(error.message)}</small>
                </div>
            `;
            this.showToast('Failed to continue video', 'error');
        }
        
        this.isGenerating = false;
        generateBtn.disabled = false;
    }

    async mergeAndPlayScenes() {
        if (this.scenes.length === 0) {
            this.showToast('No scenes to merge', 'info');
            return;
        }

        const previewArea = document.getElementById('videoPreview');
        previewArea.innerHTML = '';
        
        // Progress UI
        const overlay = document.createElement('div');
        overlay.className = 'preview-placeholder';
        overlay.style.position = 'absolute';
        overlay.style.inset = '0';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
        overlay.style.zIndex = '10';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <p style="color: white; font-weight: bold; margin-top: 10px;">Merging Scenes...</p>
            <p id="mergeProgress" style="color: white; opacity: 0.8;">Initializing...</p>
        `;
        
        // Canvas for visual recording
        const canvas = document.createElement('canvas');
        // Set standard resolution (e.g. 1024x576 or get from first video)
        // We'll update this once first video metadata loads
        canvas.width = 1024;
        canvas.height = 576;
        const ctx = canvas.getContext('2d');
        
        // Video element for playback
        const player = document.createElement('video');
        player.crossOrigin = 'anonymous';
        player.autoplay = true;
        player.muted = false; // We need audio for context but shouldn't hear it double? 
                              // Actually, if we connect to audioCtx, we can mute output or just not connect to destination
        
        const container = document.createElement('div');
        container.style.position = 'relative';
        // We show the canvas so user sees what's happening
        canvas.style.width = '100%';
        canvas.style.borderRadius = 'var(--radius-lg)';
        canvas.style.boxShadow = 'var(--shadow-lg)';
        
        container.appendChild(canvas);
        container.appendChild(overlay);
        previewArea.appendChild(container);
        
        this.showToast('Preloading videos...', 'info');
        
        // PRELOAD all videos before starting merge
        const progress = document.getElementById('mergeProgress');
        if (progress) progress.textContent = 'Preloading videos...';
        
        const preloadedVideos = [];
        for (let i = 0; i < this.scenes.length; i++) {
            const scene = this.scenes[i];
            const vid = document.createElement('video');
            vid.crossOrigin = 'anonymous';
            vid.muted = true; // Mute during preload
            vid.preload = 'auto';
            vid.src = scene.blobUrl;
            
            // Wait for video to be fully loaded
            await new Promise((resolve, reject) => {
                vid.oncanplaythrough = resolve;
                vid.onerror = reject;
                vid.load();
            });
            
            // Set canvas size from first video
            if (i === 0) {
                canvas.width = vid.videoWidth;
                canvas.height = vid.videoHeight;
            }
            
            preloadedVideos.push(vid);
            if (progress) progress.textContent = `Preloaded ${i + 1} / ${this.scenes.length}`;
        }
        
        console.log('[AIFlow] 🎬 All videos preloaded:', preloadedVideos.length);
        this.showToast('Starting recording...', 'info');

        // Web Audio Context for audio capture
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        const sourceNode = audioCtx.createMediaElementSource(player);
        sourceNode.connect(dest);
        // Also connect to destination if we want user to hear it while merging? 
        // Let's mute it for user to avoid echo/noise, progress bar is enough.
        // sourceNode.connect(audioCtx.destination); 

        // Get Stream from Canvas (video)
        const canvasStream = canvas.captureStream(30); // 30 FPS
        
        // Combine tracks
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...dest.stream.getAudioTracks()
        ]);

        const mediaRecorder = new MediaRecorder(combinedStream, {
             mimeType: 'video/webm;codecs=vp9'
        });
        
        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };
        
        mediaRecorder.start();
        
        // Drawing loop - preserve last frame during transitions
        let isRecording = true;
        let lastFrameData = null; // Store the last valid frame
        
        const draw = () => {
            if (!isRecording) return;
            
            // Only draw if video is playing and has valid dimensions
            if (player.readyState >= 2 && player.videoWidth > 0) {
                ctx.drawImage(player, 0, 0, canvas.width, canvas.height);
                // Save current frame as backup for transitions
                lastFrameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            } else if (lastFrameData) {
                // Video not ready yet - keep showing the last frame
                ctx.putImageData(lastFrameData, 0, 0);
            }
            
            requestAnimationFrame(draw);
        };
        draw();
        
        // Playback logic
        let currentIndex = 0;
        
        const playNext = async () => {
            if (currentIndex >= this.scenes.length) {
                // Finish
                console.log('[AIFlow] 🎬 Merging finished.');
                isRecording = false;
                mediaRecorder.stop();
                audioCtx.close(); // Clean up audio context
                return;
            }
            
            const scene = this.scenes[currentIndex];
            const progress = document.getElementById('mergeProgress');
            if (progress) progress.textContent = `Processing Scene ${currentIndex + 1} / ${this.scenes.length}`;
            
            player.src = scene.blobUrl;
            
            // Wait for metadata to set canvas size if it's the first video
            if (currentIndex === 0) {
                 await new Promise(r => {
                     player.onloadedmetadata = () => {
                         canvas.width = player.videoWidth;
                         canvas.height = player.videoHeight;
                         r();
                     };
                 });
            }
            
            try {
                await player.play();
            } catch (e) {
                console.error('Playback failed', e);
                currentIndex++;
                playNext();
            }
        };
        
        player.onended = () => {
            currentIndex++;
            playNext();
        };
        
        player.onerror = (e) => {
             console.error('Player error', e);
             this.showToast(`Error playing scene ${currentIndex + 1}`, 'error');
             currentIndex++;
             playNext();
        }
        
        mediaRecorder.onstop = () => {
            console.log('[AIFlow] 🎬 Recorder stopped. Creating final blob.');
            const completeBlob = new Blob(chunks, { type: 'video/webm' });
            const completeUrl = URL.createObjectURL(completeBlob);
            
            // Re-render preview with the FINAL video
            previewArea.innerHTML = '';
            
            const finalVideo = document.createElement('video');
            finalVideo.controls = true;
            finalVideo.src = completeUrl;
            finalVideo.style.width = '100%';
            finalVideo.style.borderRadius = 'var(--radius-lg)';
            finalVideo.autoplay = true;
            finalVideo.loop = true;
            
            previewArea.appendChild(finalVideo);
            
            // Add download button for the full movie
            const downloadBtn = document.createElement('a');
            downloadBtn.href = completeUrl;
            downloadBtn.download = `aiflow-movie-${Date.now()}.webm`;
            downloadBtn.className = 'btn btn-primary btn-sm';
            downloadBtn.style.marginTop = '10px';
            downloadBtn.style.display = 'block';
            downloadBtn.style.textAlign = 'center';
            downloadBtn.textContent = '💾 Download Full Movie';
            previewArea.appendChild(downloadBtn);
            
            this.addToGallery({
                type: 'video',
                url: completeUrl,
                prompt: 'Merged Video Sequence' // Ideally combine prompts
            });
            
            this.showToast('Movie merged successfully!', 'success');
        };

        // Start chain
        playNext();
    }
    
    clearScenes() {
        if (this.scenes.length === 0) return;
        
        if (confirm('Clear all scenes?')) {
            // Revoke blob URLs to free memory
            this.scenes.forEach(scene => {
                URL.revokeObjectURL(scene.blobUrl);
            });
            this.scenes = [];
            this.lastVideoBlob = null;
            this.renderScenes();
            this.showToast('Scenes cleared', 'success');
            console.log('[AIFlow] 🎬 All scenes cleared');
        }
    }
    
    // ===== Event Binding =====
    bindEvents() {
        console.log('[AIFlow] 🎯 bindEvents() started...');
        
        // Navigation
        const navItems = document.querySelectorAll('.nav-item');
        console.log('[AIFlow] 🎯 Found', navItems.length, 'nav-items');
        navItems.forEach((item, index) => {
            console.log(`[AIFlow] 🎯 Binding nav-item[${index}]:`, item.dataset.tab);
            item.addEventListener('click', (e) => {
                console.log('[AIFlow] 👆 NAV CLICK EVENT:', {
                    tab: item.dataset.tab,
                    target: e.target.tagName,
                    currentTarget: e.currentTarget.dataset.tab,
                    timeStamp: e.timeStamp
                });
                this.switchTab(item.dataset.tab);
            });
        });
        
        // Image generation
        const generateImageBtn = document.getElementById('generateImageBtn');
        console.log('[AIFlow] 🎯 generateImageBtn:', generateImageBtn ? 'FOUND' : 'NOT FOUND');
        generateImageBtn?.addEventListener('click', () => {
            console.log('[AIFlow] 👆 Generate Image button clicked!');
            const prompt = document.getElementById('imagePrompt').value;
            this.generateImage(prompt);
        });
        
        const imagePrompt = document.getElementById('imagePrompt');
        console.log('[AIFlow] 🎯 imagePrompt:', imagePrompt ? 'FOUND' : 'NOT FOUND');
        imagePrompt?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                console.log('[AIFlow] ⌨️ Enter pressed in imagePrompt');
                e.preventDefault();
                const prompt = document.getElementById('imagePrompt').value;
                this.generateImage(prompt);
            }
        });
        
        // Chat
        const sendChatBtn = document.getElementById('sendChatBtn');
        console.log('[AIFlow] 🎯 sendChatBtn:', sendChatBtn ? 'FOUND' : 'NOT FOUND');
        sendChatBtn?.addEventListener('click', () => {
            console.log('[AIFlow] 👆 Send Chat button clicked!');
            const message = document.getElementById('chatInput').value;
            this.sendChatMessage(message);
        });
        
        const chatInput = document.getElementById('chatInput');
        console.log('[AIFlow] 🎯 chatInput:', chatInput ? 'FOUND' : 'NOT FOUND');
        chatInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                console.log('[AIFlow] ⌨️ Enter pressed in chatInput');
                e.preventDefault();
                const message = document.getElementById('chatInput').value;
                this.sendChatMessage(message);
            }
        });
        
        // Auto-resize chat input
        chatInput?.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 150) + 'px';
        });
        
        // Video generation
        const generateVideoBtn = document.getElementById('generateVideoBtn');
        console.log('[AIFlow] 🎯 generateVideoBtn:', generateVideoBtn ? 'FOUND' : 'NOT FOUND');
        generateVideoBtn?.addEventListener('click', () => {
            console.log('[AIFlow] 👆 Generate Video button clicked!');
            const prompt = document.getElementById('videoPrompt').value;
            console.log('[AIFlow] 👆 Video prompt:', prompt);
            this.generateVideo(prompt);
        });
        
        // Scenes - Continue video
        const continueSceneBtn = document.getElementById('continueSceneBtn');
        console.log('[AIFlow] 🎯 continueSceneBtn:', continueSceneBtn ? 'FOUND' : 'NOT FOUND');
        continueSceneBtn?.addEventListener('click', () => {
            console.log('[AIFlow] 👆 Continue Scene button clicked!');
            const prompt = document.getElementById('continuePrompt').value;
            if (prompt.trim()) {
                this.continueVideo(prompt);
            } else {
                this.showToast('Enter a prompt to continue', 'error');
            }
        });
        
        // Scenes - Clear all
        const clearScenesBtn = document.getElementById('clearScenesBtn');
        console.log('[AIFlow] 🎯 clearScenesBtn:', clearScenesBtn ? 'FOUND' : 'NOT FOUND');
        clearScenesBtn?.addEventListener('click', () => {
            console.log('[AIFlow] 👆 Clear Scenes button clicked!');
            this.clearScenes();
        });

        // Scenes - Play All
        const playAllScenesBtn = document.getElementById('playAllScenesBtn');
        console.log('[AIFlow] 🎯 playAllScenesBtn:', playAllScenesBtn ? 'FOUND' : 'NOT FOUND');
        playAllScenesBtn?.addEventListener('click', () => {
            console.log('[AIFlow] 👆 Play All Scenes button clicked!');
            this.mergeAndPlayScenes();
        });
        
        // Gallery filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderGallery(btn.dataset.filter);
            });
        });
        
        // Clear gallery
        document.getElementById('clearGalleryBtn')?.addEventListener('click', () => {
            this.clearGallery();
        });
        
        // Settings modal
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.openSettings();
        });
        
        document.getElementById('closeSettings')?.addEventListener('click', () => {
            this.closeSettings();
        });
        
        document.getElementById('saveSettings')?.addEventListener('click', () => {
            this.saveSettingsFromForm();
        });
        
        document.getElementById('resetSettings')?.addEventListener('click', () => {
            this.resetSettings();
        });
        
        // Toggle API key visibility
        document.getElementById('toggleApiKey')?.addEventListener('click', () => {
            const input = document.getElementById('apiKey');
            input.type = input.type === 'password' ? 'text' : 'password';
        });
        
        // Image modal
        document.getElementById('closeImageModal')?.addEventListener('click', () => {
            this.closeImageModal();
        });
        
        document.getElementById('imageModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'imageModal') {
                this.closeImageModal();
            }
        });
        
        // Settings modal backdrop click
        document.getElementById('settingsModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.closeSettings();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                console.log('[AIFlow] ⌨️ Escape pressed, closing modals');
                this.closeImageModal();
                this.closeSettings();
            }
            
            // Ctrl/Cmd + number for tab switching
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1': 
                        console.log('[AIFlow] ⌨️ Ctrl+1 pressed - switching to image');
                        this.switchTab('image'); 
                        break;
                    case '2': 
                        console.log('[AIFlow] ⌨️ Ctrl+2 pressed - switching to text');
                        this.switchTab('text'); 
                        break;
                    case '3': 
                        console.log('[AIFlow] ⌨️ Ctrl+3 pressed - switching to video');
                        this.switchTab('video'); 
                        break;
                    case '4': 
                        console.log('[AIFlow] ⌨️ Ctrl+4 pressed - switching to gallery');
                        this.switchTab('gallery'); 
                        break;
                }
            }
        });
        
        console.log('%c[AIFlow] ✅ All events bound successfully!', 'color: #22c55e; font-weight: bold;');
    }
    
    // ===== Settings Modal =====
    openSettings() {
        const modal = document.getElementById('settingsModal');
        
        // Populate form
        document.getElementById('apiKey').value = this.apiKey;
        document.getElementById('apiKey').value = this.apiKey;
        document.getElementById('imgbbApiKey').value = this.imgbbApiKey || '';
        document.getElementById('imageModel').value = this.settings.imageModel;
        document.getElementById('videoModel').value = this.settings.videoModel;
        document.getElementById('textModel').value = this.settings.textModel;
        
        modal.classList.add('active');
    }
    
    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }
    
    saveSettingsFromForm() {
        this.apiKey = document.getElementById('apiKey').value.trim();
        this.imgbbApiKey = document.getElementById('imgbbApiKey').value.trim();
        this.settings.imageModel = document.getElementById('imageModel').value;
        this.settings.videoModel = document.getElementById('videoModel').value;
        this.settings.textModel = document.getElementById('textModel').value;
        
        this.saveSettings();
        this.closeSettings();
    }
    
    resetSettings() {
        if (confirm('Reset all settings to defaults?')) {
            this.apiKey = '';
            this.settings = {
                imageModel: 'flux',
                videoModel: 'seedance',
                textModel: 'openai'
            };
            this.saveSettings();
            this.openSettings(); // Refresh form
            this.showToast('Settings reset to defaults', 'success');
        }
    }
}

// Initialize app
console.log('%c[AIFlow] 📄 DOM loading...', 'color: #8b5cf6; font-size: 12px;');
document.addEventListener('DOMContentLoaded', () => {
    console.log('%c[AIFlow] 📄 DOMContentLoaded fired!', 'color: #8b5cf6; font-weight: bold; font-size: 14px;');
    console.log('[AIFlow] 📄 Creating AIFlow instance...');
    window.aiFlow = new AIFlow();
    console.log('%c[AIFlow] 🎉 Application ready! aiFlow available on window object', 'color: #22c55e; font-weight: bold; font-size: 14px;');
});
