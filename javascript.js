document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const uploadList = document.getElementById('uploadList');
    const uploadButton = document.getElementById('uploadButton');
    const clearAllButton = document.getElementById('clearAll');
    const gallery = document.getElementById('gallery');
    const progressBar = document.getElementById('uploadProgress');
    const statusText = document.getElementById('statusText');
    const searchInput = document.getElementById('searchFiles');
    const sortSelect = document.getElementById('sortFiles');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const viewerModal = document.getElementById('viewerModal');
    const closeViewer = document.getElementById('closeViewer');
    const fileViewer = document.getElementById('fileViewer');
    const viewerFilename = document.getElementById('viewerFilename');
    const viewerFilesize = document.getElementById('viewerFilesize');
    const viewerFiletype = document.getElementById('viewerFiletype');
    const viewerFiledate = document.getElementById('viewerFiledate');
    const downloadFileBtn = document.getElementById('downloadFile');
    const shareFileBtn = document.getElementById('shareFile');
    const shareModal = document.getElementById('shareModal');
    const shareLink = document.getElementById('shareLink');
    const copyLinkBtn = document.getElementById('copyLink');
    const closeShareModal = document.getElementById('closeShareModal');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const toast = document.getElementById('toast');

    // State 
    let files = [];
    let uploadedFiles = [];
    let currentFilter = 'all';
    let currentPage = 1;
    let itemsPerPage = 12;
    let currentSort = 'newest';
    let searchTerm = '';
    let currentViewFile = null;

    // Local Storage Functions
    function saveToLocalStorage() {
        localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
    }

    function getFromLocalStorage() {
        const storedFiles = localStorage.getItem('uploadedFiles');
        if (storedFiles) {
            uploadedFiles = JSON.parse(storedFiles);
        }
    }

    // Initialize
    getFromLocalStorage();
    renderGallery();
    updatePagination();

    // Event Listeners for Drag and Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    // Handle file selection
    dropArea.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFileSelect, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const newFiles = [...dt.files];
        addFilesToQueue(newFiles);
    }

    function handleFileSelect(e) {
        const newFiles = [...e.target.files];
        addFilesToQueue(newFiles);
    }

    function addFilesToQueue(newFiles) {
        files = [...files, ...newFiles];
        renderFileList();
        updateUploadButtonState();
    }

    // Render the file queue list
    function renderFileList() {
        uploadList.innerHTML = '';
        
        files.forEach((file, index) => {
            const li = document.createElement('li');
            
            const fileIcon = document.createElement('div');
            fileIcon.className = 'file-icon';
            fileIcon.innerHTML = getFileIcon(file);
            
            const fileDetails = document.createElement('div');
            fileDetails.className = 'file-details';
            
            const fileName = document.createElement('div');
            fileName.className = 'file-name';
            fileName.textContent = file.name;
            
            const fileSize = document.createElement('div');
            fileSize.className = 'file-size';
            fileSize.textContent = formatFileSize(file.size);
            
            fileDetails.appendChild(fileName);
            fileDetails.appendChild(fileSize);
            
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            fileInfo.appendChild(fileIcon);
            fileInfo.appendChild(fileDetails);
            
            const fileActions = document.createElement('div');
            fileActions.className = 'file-actions';
            
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.addEventListener('click', () => removeFile(index));
            
            fileActions.appendChild(removeBtn);
            
            li.appendChild(fileInfo);
            li.appendChild(fileActions);
            uploadList.appendChild(li);
        });
    }

    // File removal
    function removeFile(index) {
        files.splice(index, 1);
        renderFileList();
        updateUploadButtonState();
    }

    // Clear all files in queue
    clearAllButton.addEventListener('click', () => {
        files = [];
        renderFileList();
        updateUploadButtonState();
    });

    // Enable/disable upload button based on file queue
    function updateUploadButtonState() {
        uploadButton.disabled = files.length === 0;
    }

    // Upload functionality
    uploadButton.addEventListener('click', handleUpload);

    function handleUpload() {
        if (files.length === 0) return;
        
        // Simulate upload progress
        let progress = 0;
        progressBar.style.width = '0%';
        statusText.textContent = 'Uploading...';
        
        const interval = setInterval(() => {
            progress += 5;
            progressBar.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(interval);
                completeUpload();
            }
        }, 100);
    }

    function completeUpload() {
        statusText.textContent = 'Upload complete';
        
        // Add files to "uploaded" collection with metadata
        files.forEach(file => {
            const fileType = getFileType(file);
            const fileId = generateUniqueId();
            const uploadedFile = {
                id: fileId,
                name: file.name,
                size: file.size,
                type: fileType,
                url: URL.createObjectURL(file),
                date: new Date().toISOString(),
                rawFile: file // Store the actual file object
            };
            
            uploadedFiles.unshift(uploadedFile); // Add to beginning (newest first)
        });
        
        // Save to local storage
        saveToLocalStorage();
        
        // Clear the upload queue
        files = [];
        renderFileList();
        updateUploadButtonState();
        
        // Refresh the gallery
        renderGallery();
        updatePagination();
        
        // Show success toast
        showToast('success', 'Files uploaded successfully!');
    }

    // Gallery functionality
    function renderGallery() {
        gallery.innerHTML = '';
        
        // Apply filters and search
        const filteredFiles = uploadedFiles.filter(file => {
            // Filter by type
            if (currentFilter !== 'all' && file.type !== currentFilter) {
                return false;
            }
            
            // Search by filename
            if (searchTerm && !file.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }
            
            return true;
        });
        
        // Apply sorting
        const sortedFiles = [...filteredFiles].sort((a, b) => {
            switch (currentSort) {
                case 'newest':
                    return new Date(b.date) - new Date(a.date);
                case 'oldest':
                    return new Date(a.date) - new Date(b.date);
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'size':
                    return b.size - a.size;
                default:
                    return 0;
            }
        });
        
        // Pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedFiles = sortedFiles.slice(startIndex, endIndex);
        
        // Render gallery items
        paginatedFiles.forEach(file => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.dataset.id = file.id;
            
            let thumbnail;
            if (file.type === 'image') {
                thumbnail = document.createElement('img');
                thumbnail.src = file.url;
                thumbnail.alt = file.name;
            } else {
                thumbnail = document.createElement('div');
                thumbnail.className = 'file-thumbnail';
                thumbnail.innerHTML = getFileIconLarge(file);
            }
            
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
            
            const fileActions = document.createElement('div');
            fileActions.className = 'file-actions';
            
            const viewBtn = document.createElement('button');
            viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
            viewBtn.title = 'View';
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openFileViewer(file);
            });
            
            const downloadBtn = document.createElement('button');
            downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
            downloadBtn.title = 'Download';
            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadFile(file);
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Delete';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteFile(file.id);
            });
            
            fileActions.appendChild(viewBtn);
            fileActions.appendChild(downloadBtn);
            fileActions.appendChild(deleteBtn);
            
            galleryItem.appendChild(thumbnail);
            galleryItem.appendChild(fileInfo);
            galleryItem.appendChild(fileActions);
            
            // Add click event to the whole item
            galleryItem.addEventListener('click', () => {
                openFileViewer(file);
            });
            
            gallery.appendChild(galleryItem);
        });
        
        // If no files to display
        if (paginatedFiles.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.style.gridColumn = '1 / -1';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '50px 0';
            emptyMessage.style.color = '#666';
            
            if (uploadedFiles.length === 0) {
                emptyMessage.innerHTML = '<i class="fas fa-cloud-upload-alt fa-3x"></i><p style="margin-top: 15px;">No files uploaded yet</p>';
            } else {
                emptyMessage.innerHTML = '<i class="fas fa-search fa-3x"></i><p style="margin-top: 15px;">No files match your search criteria</p>';
            }
            
            gallery.appendChild(emptyMessage);
        }
    }

    // Pagination
    function updatePagination() {
        // Get filtered files count
        const filteredFiles = uploadedFiles.filter(file => {
            if (currentFilter !== 'all' && file.type !== currentFilter) {
                return false;
            }
            
            if (searchTerm && !file.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }
            
            return true;
        });
        
        const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
        
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
    }

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderGallery();
            updatePagination();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const filteredFiles = uploadedFiles.filter(file => {
            if (currentFilter !== 'all' && file.type !== currentFilter) {
                return false;
            }
            
            if (searchTerm && !file.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }
            
            return true;
        });
        
        const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
        
        if (currentPage < totalPages) {
            currentPage++;
            renderGallery();
            updatePagination();
        }
    });

    // Filter buttons
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentFilter = button.getAttribute('data-filter');
            currentPage = 1;
            renderGallery();
            updatePagination();
        });
    });

    // Search functionality
    searchInput.addEventListener('input', () => {
        searchTerm = searchInput.value;
        currentPage = 1;
        renderGallery();
        updatePagination();
    });

    // Sort functionality
    sortSelect.addEventListener('change', () => {
        currentSort = sortSelect.value;
        renderGallery();
    });

    // File viewer
    function openFileViewer(file) {
        currentViewFile = file;
        viewerFilename.textContent = file.name;
        viewerFilesize.textContent = formatFileSize(file.size);
        viewerFiletype.textContent = getFileTypeName(file);
        viewerFiledate.textContent = formatDate(file.date);
        
        fileViewer.innerHTML = '';
        
        if (file.type === 'image') {
            const img = document.createElement('img');
            img.src = file.url;
            img.alt = file.name;
            fileViewer.appendChild(img);
        } else if (file.type === 'document' && file.name.endsWith('.pdf')) {
            const embed = document.createElement('embed');
            embed.src = file.url;
            embed.type = 'application/pdf';
            embed.style.width = '100%';
            embed.style.height = '600px';
            fileViewer.appendChild(embed);
        } else if (file.type === 'audio') {
            const audio = document.createElement('audio');
            audio.src = file.url;
            audio.controls = true;
            audio.style.width = '100%';
            fileViewer.appendChild(audio);
        } else if (file.type === 'video') {
            const video = document.createElement('video');
            video.src = file.url;
            video.controls = true;
            video.style.maxWidth = '100%';
            video.style.maxHeight = '600px';
            fileViewer.appendChild(video);
        } else {
            const icon = document.createElement('div');
            icon.style.fontSize = '8rem';
            icon.style.color = '#4a6fd8';
            icon.innerHTML = getFileIconLarge(file);
            
            const message = document.createElement('p');
            message.textContent = 'Preview not available for this file type';
            message.style.marginTop = '20px';
            message.style.color = '#666';
            
            fileViewer.appendChild(icon);
            fileViewer.appendChild(message);
        }
        
        viewerModal.classList.add('visible');
    }

    closeViewer.addEventListener('click', () => {
        viewerModal.classList.remove('visible');
    });

    // Download file
    downloadFileBtn.addEventListener('click', () => {
        if (currentViewFile) {
            downloadFile(currentViewFile);
        }
    });

    function downloadFile(file) {
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Share file functionality
    shareFileBtn.addEventListener('click', () => {
        if (currentViewFile) {
            shareLink.value = `https://example.com/share/${currentViewFile.id}`;
            shareModal.classList.add('visible');
        }
    });

    closeShareModal.addEventListener('click', () => {
        shareModal.classList.remove('visible');
    });

    copyLinkBtn.addEventListener('click', () => {
        shareLink.select();
        document.execCommand('copy');
        showToast('success', 'Link copied to clipboard!');
    });

    // Delete file
    function deleteFile(fileId) {
        if (confirm('Are you sure you want to delete this file?')) {
            uploadedFiles = uploadedFiles.filter(file => file.id !== fileId);
            saveToLocalStorage();
            renderGallery();
            updatePagination();
            showToast('success', 'File deleted successfully!');
        }
    }

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === viewerModal) {
            viewerModal.classList.remove('visible');
        }
        if (e.target === shareModal) {
            shareModal.classList.remove('visible');
        }
    });

    // Toast notifications
    function showToast(type, message) {
        toast.className = `toast ${type} visible`;
        const icon = toast.querySelector('.toast-icon i');
        
        if (type === 'success') {
            icon.className = 'fas fa-check-circle';
        } else if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
        } else if (type === 'warning') {
            icon.className = 'fas fa-exclamation-triangle';
        }
        
        toast.querySelector('.toast-message').textContent = message;
        
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 300);
        }, 3000);
    }

    // Helper functions
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    function getFileType(file) {
        const type = file.type.split('/')[0];
        
        if (type === 'image') return 'image';
        if (type === 'audio') return 'audio';
        if (type === 'video') return 'video';
        
        if (type === 'application') {
            const extension = file.name.split('.').pop().toLowerCase();
            if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(extension)) {
                return 'document';
            }
        }
        
        return 'other';
    }

    function getFileTypeName(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        // Common file types mapped to friendly names
        const fileTypes = {
            'jpg': 'JPEG Image',
            'jpeg': 'JPEG Image',
            'png': 'PNG Image',
            'gif': 'GIF Image',
            'svg': 'SVG Image',
            'pdf': 'PDF Document',
            'doc': 'Word Document',
            'docx': 'Word Document',
            'xls': 'Excel Spreadsheet',
            'xlsx': 'Excel Spreadsheet',
            'ppt': 'PowerPoint Presentation',
            'pptx': 'PowerPoint Presentation',
            'txt': 'Text Document',
            'mp3': 'MP3 Audio',
            'wav': 'WAV Audio',
            'mp4': 'MP4 Video',
            'mov': 'MOV Video',
            'zip': 'ZIP Archive',
            'rar': 'RAR Archive'
        };
        
        return fileTypes[extension] || `${extension.toUpperCase()} File`;
    }

    function getFileIcon(file) {
        const type = getFileType(file);
        const extension = file.name.split('.').pop().toLowerCase();
        
        // Return appropriate icon based on file type
        switch (type) {
            case 'image':
                return '<i class="far fa-image"></i>';
            case 'audio':
                return '<i class="far fa-file-audio"></i>';
            case 'video':
                return '<i class="far fa-file-video"></i>';
            case 'document':
                switch (extension) {
                    case 'pdf':
                        return '<i class="far fa-file-pdf"></i>';
                    case 'doc':
                    case 'docx':
                        return '<i class="far fa-file-word"></i>';
                    case 'xls':
                    case 'xlsx':
                        return '<i class="far fa-file-excel"></i>';
                    case 'ppt':
                    case 'pptx':
                        return '<i class="far fa-file-powerpoint"></i>';
                    case 'txt':
                        return '<i class="far fa-file-alt"></i>';
                    default:
                        return '<i class="far fa-file-alt"></i>';
                }
            default:
                switch (extension) {
                    case 'zip':
                    case 'rar':
                    case '7z':
                        return '<i class="far fa-file-archive"></i>';
                    case 'js':
                    case 'php':
                    case 'html':
                    case 'css':
                        return '<i class="far fa-file-code"></i>';
                    default:
                        return '<i class="far fa-file"></i>';
                }
        }
    }

    function getFileIconLarge(file) {
        const type = getFileType(file);
        const extension = file.name.split('.').pop().toLowerCase();
        
        // Same as getFileIcon but returns the same icons
        switch (type) {
            case 'image':
                return '<i class="far fa-image"></i>';
            case 'audio':
                return '<i class="far fa-file-audio"></i>';
            case 'video':
                return '<i class="far fa-file-video"></i>';
            case 'document':
                switch (extension) {
                    case 'pdf':
                        return '<i class="far fa-file-pdf"></i>';
                    case 'doc':
                    case 'docx':
                        return '<i class="far fa-file-word"></i>';
                    case 'xls':
                    case 'xlsx':
                        return '<i class="far fa-file-excel"></i>';
                    case 'ppt':
                    case 'pptx':
                        return '<i class="far fa-file-powerpoint"></i>';
                    case 'txt':
                        return '<i class="far fa-file-alt"></i>';
                    default:
                        return '<i class="far fa-file-alt"></i>';
                }
            default:
                switch (extension) {
                    case 'zip':
                    case 'rar':
                    case '7z':
                        return '<i class="far fa-file-archive"></i>';
                    case 'js':
                    case 'php':
                    case 'html':
                    case 'css':
                        return '<i class="far fa-file-code"></i>';
                    default:
                        return '<i class="far fa-file"></i>';
                }
        }
    }

    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
});
