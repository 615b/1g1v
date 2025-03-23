document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const uploadList = document.getElementById('uploadList');
    const uploadButton = document.getElementById('uploadButton');
    const clearAllButton = document.getElementById('clearAll');
    const uploadProgress = document.getElementById('uploadProgress');
    const statusText = document.getElementById('statusText');
    const gallery = document.getElementById('gallery');
    const toast = document.getElementById('toast');
    
    // File Queue
    let fileQueue = [];
    let uploadedFiles = [];
    
    // Event Listeners
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('highlight');
    });
    
    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('highlight');
    });
    
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('highlight');
        
        const files = e.dataTransfer.files;
        handleFiles(files);
    });
    
    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
    });
    
    uploadButton.addEventListener('click', uploadFiles);
    
    clearAllButton.addEventListener('click', () => {
        fileQueue = [];
        uploadList.innerHTML = '';
        uploadButton.disabled = true;
        statusText.textContent = 'Ready to upload';
    });
    
    // Functions
    function handleFiles(files) {
        if (files.length === 0) return;
        
        for (const file of files) {
            if (!fileQueue.some(f => f.name === file.name)) {
                fileQueue.push(file);
                addFileToList(file);
            }
        }
        
        if (fileQueue.length > 0) {
            uploadButton.disabled = false;
        }
        
        statusText.textContent = `${fileQueue.length} file(s) ready to upload`;
    }
    
    function addFileToList(file) {
        const fileItem = document.createElement('li');
        
        const fileSize = formatFileSize(file.size);
        const fileIcon = getFileIcon(file.type);
        
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon"><i class="${fileIcon}"></i></div>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
            </div>
            <div class="file-actions">
                <button class="remove-file"><i class="fas fa-times"></i></button>
            </div>
        `;
        
        fileItem.querySelector('.remove-file').addEventListener('click', () => {
            fileQueue = fileQueue.filter(f => f.name !== file.name);
            fileItem.remove();
            
            if (fileQueue.length === 0) {
                uploadButton.disabled = true;
                statusText.textContent = 'Ready to upload';
            } else {
                statusText.textContent = `${fileQueue.length} file(s) ready to upload`;
            }
        });
        
        uploadList.appendChild(fileItem);
    }
    
    function uploadFiles() {
        if (fileQueue.length === 0) return;
        
        uploadButton.disabled = true;
        let filesUploaded = 0;
        
        // Simulate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 5;
            uploadProgress.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(progressInterval);
                
                setTimeout(() => {
                    // Reset progress
                    uploadProgress.style.width = '0%';
                    fileQueue.forEach(file => {
                        const fileUrl = URL.createObjectURL(file);
                        addFileToGallery(file, fileUrl);
                        uploadedFiles.push({
                            file: file,
                            url: fileUrl,
                            date: new Date(),
                            id: generateFileId()
                        });
                    });
                    
                    // Clear queue
                    fileQueue = [];
                    uploadList.innerHTML = '';
                    
                    // Show toast
                    showToast('success', 'Files uploaded successfully!');
                    statusText.textContent = 'Ready to upload';
                }, 500);
            }
        }, 100);
    }
    
    function addFileToGallery(file, fileUrl) {
        const fileItem = document.createElement('div');
        fileItem.className = 'gallery-item';
        
        const isImage = file.type.startsWith('image/');
        const fileIcon = getFileIcon(file.type);
        const fileDate = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        fileItem.innerHTML = `
            ${isImage ? 
                `<img src="${fileUrl}" alt="${file.name}">` : 
                `<div class="file-thumbnail"><i class="${fileIcon}"></i></div>`
            }
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatFileSize(file.size)} · ${fileDate}</div>
            </div>
            <div class="file-actions">
                <button class="download-file" title="Download"><i class="fas fa-download"></i></button>
                <button class="share-file" title="Share"><i class="fas fa-share-alt"></i></button>
            </div>
        `;
        
        // Add event listeners
        fileItem.querySelector('.download-file').addEventListener('click', () => {
            downloadFile(fileUrl, file.name);
        });
        
        fileItem.querySelector('.share-file').addEventListener('click', () => {
            openShareModal(fileUrl, file.name);
        });
        
        fileItem.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                openViewerModal(file, fileUrl);
            }
        });
        
        gallery.prepend(fileItem);
    }
    
    function downloadFile(fileUrl, fileName) {
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    
    function openShareModal(fileUrl, fileName) {
        const shareModal = document.getElementById('shareModal');
        const shareLink = document.getElementById('shareLink');
        const copyLinkBtn = document.getElementById('copyLink');
        const closeShareModalBtn = document.getElementById('closeShareModal');
        
        // In a real app, you'd generate a real sharing URL here
        shareLink.value = `${window.location.origin}/share/${generateFileId()}/${fileName}`;
        
        shareModal.classList.add('visible');
        
        copyLinkBtn.addEventListener('click', () => {
            shareLink.select();
            document.execCommand('copy');
            showToast('success', 'Link copied to clipboard!');
        });
        
        closeShareModalBtn.addEventListener('click', () => {
            shareModal.classList.remove('visible');
        });
    }
    
    function openViewerModal(file, fileUrl) {
        const viewerModal = document.getElementById('viewerModal');
        const fileViewer = document.getElementById('fileViewer');
        const viewerFilename = document.getElementById('viewerFilename');
        const viewerFilesize = document.getElementById('viewerFilesize');
        const viewerFiletype = document.getElementById('viewerFiletype');
        const viewerFiledate = document.getElementById('viewerFiledate');
        const downloadFile = document.getElementById('downloadFile');
        const shareFile = document.getElementById('shareFile');
        const closeViewer = document.getElementById('closeViewer');
        
        viewerFilename.textContent = file.name;
        viewerFilesize.textContent = formatFileSize(file.size);
        viewerFiletype.textContent = file.type || 'Unknown';
        viewerFiledate.textContent = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Clear previous content
        fileViewer.innerHTML = '';
        
        // Display content based on file type
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = fileUrl;
            fileViewer.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = fileUrl;
            video.controls = true;
            fileViewer.appendChild(video);
        } else if (file.type.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.src = fileUrl;
            audio.controls = true;
            fileViewer.appendChild(audio);
        } else {
            fileViewer.innerHTML = `<i class="${getFileIcon(file.type)} fa-5x"></i>`;
        }
        
        viewerModal.classList.add('visible');
        
        // Add event listeners
        downloadFile.addEventListener('click', () => {
            const a = document.createElement('a');
            a.href = fileUrl;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
        
        shareFile.addEventListener('click', () => {
            viewerModal.classList.remove('visible');
            openShareModal(fileUrl, file.name);
        });
        
        closeViewer.addEventListener('click', () => {
            viewerModal.classList.remove('visible');
        });
    }
    
    // Helper functions
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    function getFileIcon(fileType) {
        if (fileType.startsWith('image/')) {
            return 'far fa-file-image';
        } else if (fileType.startsWith('video/')) {
            return 'far fa-file-video';
        } else if (fileType.startsWith('audio/')) {
            return 'far fa-file-audio';
        } else if (fileType.includes('pdf')) {
            return 'far fa-file-pdf';
        } else if (fileType.includes('word') || fileType.includes('document')) {
            return 'far fa-file-word';
        } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
            return 'far fa-file-excel';
        } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
            return 'far fa-file-powerpoint';
        } else if (fileType.includes('zip') || fileType.includes('compressed')) {
            return 'far fa-file-archive';
        } else if (fileType.includes('text')) {
            return 'far fa-file-alt';
        } else if (fileType.includes('code') || fileType.includes('javascript') || fileType.includes('html') || fileType.includes('css')) {
            return 'far fa-file-code';
        } else {
            return 'far fa-file';
        }
    }
    
    function generateFileId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    
    function showToast(type, message) {
        toast.className = `toast ${type}`;
        toast.querySelector('.toast-message').textContent = message;
        
        const icon = toast.querySelector('.toast-icon i');
        if (type === 'success') {
            icon.className = 'fas fa-check-circle';
        } else if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
        } else if (type === 'warning') {
            icon.className = 'fas fa-exclamation-triangle';
        }
        
        toast.classList.add('visible');
        
        setTimeout(() => {
            toast.classList.remove('visible');
        }, 3000);
    }
    
    // Initialize with some demo files (optional)
    // loadDemoFiles();
});
