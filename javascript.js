document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const uploadList = document.getElementById('uploadList');
    const uploadButton = document.getElementById('uploadButton');
    const gallery = document.getElementById('gallery');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const settingsBtn = document.getElementById('settingsBtn');
    const authModal = document.getElementById('authModal');
    const saveAuthBtn = document.getElementById('saveAuth');
    const closeModalBtn = document.getElementById('closeModal');

    // State
    let filesToUpload = [];
    let currentFilter = 'all';
    let authSettings = {
        repoOwner: localStorage.getItem('repoOwner') || '',
        repoName: localStorage.getItem('repoName') || '',
        token: localStorage.getItem('token') || ''
    };

    // Initialize
    init();

    // Functions
    function init() {
        bindEvents();
        loadExistingUploads();
        
        // Check if auth settings are available
        if (!authSettings.repoOwner || !authSettings.repoName || !authSettings.token) {
            showAuthModal();
        }
    }

    function bindEvents() {
        // Drag and drop events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });

        dropArea.addEventListener('drop', handleDrop, false);
        fileInput.addEventListener('change', handleFileSelect);
        uploadButton.addEventListener('click', handleUpload);

        // Filter buttons
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.getAttribute('data-filter');
                setActiveFilter(filter);
                filterGallery(filter);
            });
        });

        // Settings button
        settingsBtn.addEventListener('click', showAuthModal);
        saveAuthBtn.addEventListener('click', saveAuthSettings);
        closeModalBtn.addEventListener('click', hideAuthModal);
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFileSelect() {
        handleFiles(fileInput.files);
    }

    function handleFiles(files) {
        if (files.length === 0) return;
        
        Array.from(files).forEach(file => {
            // Check if file already exists in the queue
            if (!filesToUpload.some(f => f.name === file.name && f.size === file.size)) {
                filesToUpload.push(file);
                addFileToQueue(file);
            } else {
                showToast('File already in queue', 'warning');
            }
        });
        
        updateUploadButton();
    }

    function addFileToQueue(file) {
        const li = document.createElement('li');
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        
        const fileIcon = document.createElement('span');
        fileIcon.className = 'file-icon';
        fileIcon.textContent = getFileIcon(file.type);
        
        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        
        const fileSize = document.createElement('span');
        fileSize.className = 'file-size';
        fileSize.textContent = formatFileSize(file.size);
        
        fileInfo.appendChild(fileIcon);
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        
        const fileActions = document.createElement('div');
        fileActions.className = 'file-actions';
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove file';
        removeBtn.addEventListener('click', () => removeFileFromQueue(file, li));
        
        fileActions.appendChild(removeBtn);
        
        li.appendChild(fileInfo);
        li.appendChild(fileActions);
        
        uploadList.appendChild(li);
    }

    function removeFileFromQueue(file, element) {
        filesToUpload = filesToUpload.filter(f => !(f.name === file.name && f.size === file.size));
        element.remove();
        updateUploadButton();
    }

    function updateUploadButton() {
        uploadButton.disabled = filesToUpload.length === 0;
    }

    function getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎬';
        if (mimeType.startsWith('audio/')) return '🎵';
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
        if (mimeType.includes('text/')) return '📝';
        if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜️';
        return '📁';
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function handleUpload() {
        if (!authSettings.repoOwner || !authSettings.repoName || !authSettings.token) {
            showToast('Please configure your GitHub settings first', 'error');
            showAuthModal();
            return;
        }

        if (filesToUpload.length === 0) {
            showToast('No files to upload', 'warning');
            return;
        }

        uploadButton.disabled = true;
        let uploadedCount = 0;
        let errors = 0;

        filesToUpload.forEach(file => {
            uploadFile(file)
                .then(() => {
                    uploadedCount++;
                    if (uploadedCount + errors === filesToUpload.length) {
                        finishUpload(uploadedCount, errors);
                    }
                })
                .catch(() => {
                    errors++;
                    if (uploadedCount + errors === filesToUpload.length) {
                        finishUpload(uploadedCount, errors);
                    }
                });
        });
    }

    function uploadFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const content = e.target.result;
                const base64Content = content.split(',')[1]; // Remove data URL prefix
                
                // Create a unique filename to avoid conflicts
                const timestamp = new Date().getTime();
                const uniqueFilename = `${timestamp}-${file.name}`;
                
                // Get file extension for metadata
                const fileExtension = file.name.split('.').pop().toLowerCase();
                
                // GitHub API requires content to be base64 encoded
                fetch(`https://api.github.com/repos/${authSettings.repoOwner}/${authSettings.repoName}/contents/uploads/${uniqueFilename}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${authSettings.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Upload ${file.name}`,
                        content: base64Content,
                        branch: 'main' // Make sure this matches your repository's default branch
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to upload file: ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    // Get the raw URL for the file
                    const downloadUrl = `https://raw.githubusercontent.com/${authSettings.repoOwner}/${authSettings.repoName}/main/uploads/${uniqueFilename}`;
                    
                    // Store file metadata in localStorage for gallery display
                    saveFileMetadata({
                        name: file.name,
                        path: uniqueFilename,
                        size: file.size,
                        type: file.type,
                        url: downloadUrl,
                        timestamp: timestamp,
                        extension: fileExtension
                    });
                    
                    showToast(`Uploaded: ${file.name}`, 'success');
                    resolve();
                })
                .catch(error => {
                    console.error('Error uploading file:', error);
                    showToast(`Failed to upload: ${file.name}`, 'error');
                    reject(error);
                });
            };
            
            reader.onerror = function() {
                showToast(`Error reading file: ${file.name}`, 'error');
                reject(new Error('FileReader error'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    function finishUpload(successCount, errorCount) {
        if (successCount > 0) {
            showToast(`Uploaded ${successCount} file${successCount > 1 ? 's' : ''}`, 'success');
            
            // Clear the upload queue for successfully uploaded files
            filesToUpload = [];
            uploadList.innerHTML = '';
            updateUploadButton();
            
            // Refresh the gallery
            loadExistingUploads();
        }
        
        if (errorCount > 0) {
            showToast(`Failed to upload ${errorCount} file${errorCount > 1 ? 's' : ''}`, 'error');
        }
    }

    function saveFileMetadata(fileData) {
        let files = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
        files.push(fileData);
        localStorage.setItem('uploadedFiles', JSON.stringify(files));
    }

    function loadExistingUploads() {
        const files = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
        
        // Sort files by timestamp (newest first)
        files.sort((a, b) => b.timestamp - a.timestamp);
        
        // Display files in gallery
        renderGallery(files);
    }

    function renderGallery(files) {
        gallery.innerHTML = '';
        
        if (files.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.textContent = 'No files uploaded yet.';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.gridColumn = '1 / -1';
            emptyMessage.style.padding = '30px';
            emptyMessage.style.color = '#666';
            gallery.appendChild(emptyMessage);
            return;
        }
        
        files.forEach(file => {
            // Skip files that don't match the current filter
            if (currentFilter !== 'all') {
                if (currentFilter === 'image' && !file.type.startsWith('image/')) return;
                if (currentFilter === 'document' && !(
                    file.type.includes('pdf') || 
                    file.type.includes('word') || 
                    file.type.includes('document') ||
                    file.type.includes('text/') ||
                    ['doc', 'docx', 'txt', 'pdf', 'rtf'].includes(file.extension)
                )) return;
                if (currentFilter === 'other' && (
                    file.type.startsWith('image/') || 
                    file.type.includes('pdf') || 
                    file.type.includes('word') || 
                    file.type.includes('document') ||
                    file.type.includes('text/') ||
                    ['doc', 'docx', 'txt', 'pdf', 'rtf'].includes(file.extension)
                )) return;
            }
            
            const fileItem = document.createElement('div');
            fileItem.className = 'gallery-item';
            
            // Create thumbnail
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = file.url;
                img.alt = file.name;
                img.addEventListener('click', () => window.open(file.url, '_blank'));
                fileItem.appendChild(img);
            } else {
                const thumbnail = document.createElement('div');
                thumbnail.className = 'file-thumbnail';
                thumbnail.textContent = getFileIcon(file.type);
                fileItem.appendChild(thumbnail);
            }
            
            // File info
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            
            const fileName = document.createElement('div');
            fileName.className = 'file-name';
            fileName.textContent = file.name;
            
            const fileSize = document.createElement('div');
            fileSize.className = 'file-size';
            fileSize.textContent = formatFileSize(file.size);
            
            fileInfo.appendChild(fileName);
            fileInfo.appendChild(fileSize);
            
            // File actions
            const fileActions = document.createElement('div');
            fileActions.className = 'file-actions';
            
            const copyBtn = document.createElement('button');
            copyBtn.innerHTML = '📋';
            copyBtn.title = 'Copy URL';
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(file.url)
                    .then(() => showToast('URL copied to clipboard', 'success'))
                    .catch(() => showToast('Failed to copy URL', 'error'));
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = 'Delete file';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteFile(file);
            });
            
            fileActions.appendChild(copyBtn);
            fileActions.appendChild(deleteBtn);
            
            fileItem.appendChild(fileActions);
            fileItem.appendChild(fileInfo);
            
            gallery.appendChild(fileItem);
        });
    }

    function deleteFile(file) {
        if (!confirm(`Are you sure you want to delete ${file.name}?`)) {
            return;
        }
        
        fetch(`https://api.github.com/repos/${authSettings.repoOwner}/${authSettings.repoName}/contents/uploads/${file.path}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${authSettings.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Delete ${file.name}`,
                branch: 'main',
                sha: '' // We'd need the file's SHA here, but we'll handle the error
            })
        })
        .then(response => {
            if (