class BatchImageProcessor {
    constructor() {
        this.images = new Map(); // 存储所有图片数据
        this.currentImageId = null; // 当前选中的图片ID
        this.batchMode = false; // 批量模式标志
        this.maxImages = 50; // 最大图片数量
        this.maxFileSize = 20 * 1024 * 1024; // 20MB
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // 上传相关
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadProgress = document.getElementById('uploadProgress');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        // 编辑器区域
        this.editorSection = document.getElementById('editorSection');
        
        // 模式切换
        this.batchModeToggle = document.getElementById('batchModeToggle');
        
        // 图片列表
        this.imageList = document.getElementById('imageList');
        this.imageCount = document.getElementById('imageCount');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        
        // 预览和控制
        this.canvas = document.getElementById('imageCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.previewInfo = document.getElementById('previewInfo');
        this.currentImageName = document.getElementById('currentImageName');
        
        // 亮度控制
        this.brightnessSlider = document.getElementById('brightnessSlider');
        this.brightnessInput = document.getElementById('brightnessInput');
        
        // 尺寸控制
        this.widthInput = document.getElementById('widthInput');
        this.heightInput = document.getElementById('heightInput');
        this.keepAspectRatio = document.getElementById('keepAspectRatio');
        this.presetBtns = document.querySelectorAll('.preset-btn');
        
        // 操作按钮
        this.resetBtn = document.getElementById('resetBtn');
        this.resetAllBtn = document.getElementById('resetAllBtn');
        this.downloadCurrentBtn = document.getElementById('downloadCurrentBtn');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        this.addMoreBtn = document.getElementById('addMoreBtn');
    }

    bindEvents() {
        // 上传事件
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
        
        // 拖拽事件
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // 模式切换
        this.batchModeToggle.addEventListener('change', () => this.toggleBatchMode());
        
        // 控制事件
        this.brightnessSlider.addEventListener('input', (e) => this.updateBrightness(parseInt(e.target.value)));
        this.brightnessInput.addEventListener('input', (e) => this.updateBrightness(parseInt(e.target.value)));
        
        this.widthInput.addEventListener('input', () => this.updateSize());
        this.heightInput.addEventListener('input', () => this.updateSize());
        this.keepAspectRatio.addEventListener('change', () => this.updateSize());
        
        // 预设尺寸按钮
        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', () => this.applyPresetSize(parseInt(btn.dataset.size)));
        });
        
        // 操作按钮
        this.resetBtn.addEventListener('click', () => this.resetCurrent());
        this.resetAllBtn.addEventListener('click', () => this.resetAll());
        this.downloadCurrentBtn.addEventListener('click', () => this.downloadCurrent());
        this.downloadAllBtn.addEventListener('click', () => this.downloadAll());
        this.addMoreBtn.addEventListener('click', () => this.fileInput.click());
        this.clearAllBtn.addEventListener('click', () => this.clearAll());
    }

    // 文件上传处理
    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        this.handleFileSelect(files);
    }

    async handleFileSelect(files) {
        if (!files || files.length === 0) return;
        
        const validFiles = this.validateFiles(files);
        if (validFiles.length === 0) return;
        
        this.showProgress();
        
        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            const progress = ((i + 1) / validFiles.length) * 100;
            this.updateProgress(progress, `正在处理 ${i + 1}/${validFiles.length}`);
            
            await this.loadImage(file);
        }
        
        this.hideProgress();
        this.showEditor();
        this.updateImageCount();
        
        // 如果是第一次添加图片，选择第一张
        if (this.currentImageId === null && this.images.size > 0) {
            const firstImageId = this.images.keys().next().value;
            this.selectImage(firstImageId);
        }
    }

    validateFiles(files) {
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
        const validFiles = [];
        
        for (const file of files) {
            // 检查总数限制
            if (this.images.size + validFiles.length >= this.maxImages) {
                alert(`最多只能上传 ${this.maxImages} 张图片`);
                break;
            }
            
            // 检查文件类型
            if (!validTypes.includes(file.type)) {
                alert(`文件 ${file.name} 格式不支持`);
                continue;
            }
            
            // 检查文件大小
            if (file.size > this.maxFileSize) {
                alert(`文件 ${file.name} 超过 20MB 限制`);
                continue;
            }
            
            validFiles.push(file);
        }
        
        return validFiles;
    }

    async loadImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const imageId = this.generateImageId();
                    const imageData = {
                        id: imageId,
                        name: file.name,
                        originalImage: img,
                        originalWidth: img.width,
                        originalHeight: img.height,
                        currentWidth: img.width,
                        currentHeight: img.height,
                        brightness: 100,
                        originalImageData: null,
                        canvas: null,
                        isModified: false
                    };
                    
                    this.images.set(imageId, imageData);
                    this.addImageToList(imageData);
                    resolve();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    generateImageId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    addImageToList(imageData) {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        imageItem.dataset.imageId = imageData.id;
        
        // 创建缩略图
        const thumbnail = document.createElement('img');
        thumbnail.className = 'image-thumbnail';
        thumbnail.src = this.createThumbnail(imageData.originalImage);
        
        // 创建信息区域
        const info = document.createElement('div');
        info.className = 'image-info';
        
        const name = document.createElement('div');
        name.className = 'image-name';
        name.textContent = imageData.name;
        
        const details = document.createElement('div');
        details.className = 'image-details';
        details.textContent = `${imageData.originalWidth} × ${imageData.originalHeight}`;
        
        info.appendChild(name);
        info.appendChild(details);
        
        // 创建状态指示器
        const status = document.createElement('div');
        status.className = 'image-status';
        
        imageItem.appendChild(thumbnail);
        imageItem.appendChild(info);
        imageItem.appendChild(status);
        
        // 添加点击事件
        imageItem.addEventListener('click', () => this.selectImage(imageData.id));
        
        this.imageList.appendChild(imageItem);
    }

    createThumbnail(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 50;
        canvas.height = 50;
        
        // 计算缩放比例以填充正方形
        const scale = Math.max(50 / img.width, 50 / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        const x = (50 - width) / 2;
        const y = (50 - height) / 2;
        
        ctx.drawImage(img, x, y, width, height);
        return canvas.toDataURL();
    }

    selectImage(imageId) {
        // 移除之前的选中状态
        if (this.currentImageId) {
            const prevItem = document.querySelector(`[data-image-id="${this.currentImageId}"]`);
            if (prevItem) prevItem.classList.remove('selected');
        }
        
        // 设置新的选中状态
        this.currentImageId = imageId;
        const currentItem = document.querySelector(`[data-image-id="${imageId}"]`);
        if (currentItem) currentItem.classList.add('selected');
        
        // 更新预览和控制面板
        this.updatePreview();
        this.updateControls();
    }

    updatePreview() {
        if (!this.currentImageId) return;
        
        const imageData = this.images.get(this.currentImageId);
        if (!imageData) return;
        
        this.currentImageName.textContent = imageData.name;
        this.previewInfo.style.display = 'none';
        
        this.renderImage(imageData);
    }

    renderImage(imageData) {
        const maxWidth = 600;
        const maxHeight = 400;
        
        let { currentWidth, currentHeight } = imageData;
        
        // 计算显示尺寸（保持比例）
        const ratio = Math.min(maxWidth / currentWidth, maxHeight / currentHeight, 1);
        const displayWidth = currentWidth * ratio;
        const displayHeight = currentHeight * ratio;
        
        this.canvas.width = displayWidth;
        this.canvas.height = displayHeight;
        
        // 创建临时canvas进行处理
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = currentWidth;
        tempCanvas.height = currentHeight;
        
        // 绘制调整后的图片
        tempCtx.drawImage(imageData.originalImage, 0, 0, currentWidth, currentHeight);
        
        // 应用亮度调整
        if (imageData.brightness !== 100) {
            const imageDataObj = tempCtx.getImageData(0, 0, currentWidth, currentHeight);
            this.applyBrightnessToImageData(imageDataObj, imageData.brightness);
            tempCtx.putImageData(imageDataObj, 0, 0);
        }
        
        // 绘制到显示canvas
        this.ctx.clearRect(0, 0, displayWidth, displayHeight);
        this.ctx.drawImage(tempCanvas, 0, 0, displayWidth, displayHeight);
        
        // 保存处理后的canvas引用
        imageData.canvas = tempCanvas;
    }

    applyBrightnessToImageData(imageData, brightness) {
        const data = imageData.data;
        const factor = brightness / 100;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * factor);     // R
            data[i + 1] = Math.min(255, data[i + 1] * factor); // G
            data[i + 2] = Math.min(255, data[i + 2] * factor); // B
        }
    }

    updateControls() {
        if (!this.currentImageId) return;
        
        const imageData = this.images.get(this.currentImageId);
        if (!imageData) return;
        
        // 更新亮度控件
        this.brightnessSlider.value = imageData.brightness;
        this.brightnessInput.value = imageData.brightness;
        
        // 更新尺寸控件
        this.widthInput.value = imageData.currentWidth;
        this.heightInput.value = imageData.currentHeight;
    }

    // 模式切换
    toggleBatchMode() {
        this.batchMode = this.batchModeToggle.checked;
        console.log('批量模式:', this.batchMode ? '开启' : '关闭');
    }

    // 亮度调节
    updateBrightness(brightness) {
        if (isNaN(brightness)) return;
        
        brightness = Math.max(0, Math.min(200, brightness));
        this.brightnessSlider.value = brightness;
        this.brightnessInput.value = brightness;
        
        if (this.batchMode) {
            // 批量模式：应用到所有图片
            this.images.forEach(imageData => {
                imageData.brightness = brightness;
                imageData.isModified = true;
                this.updateImageStatus(imageData.id);
            });
        } else {
            // 分别调节模式：只应用到当前图片
            if (this.currentImageId) {
                const imageData = this.images.get(this.currentImageId);
                if (imageData) {
                    imageData.brightness = brightness;
                    imageData.isModified = true;
                    this.updateImageStatus(imageData.id);
                }
            }
        }
        
        // 更新预览
        this.updatePreview();
    }

    // 尺寸调节
    updateSize() {
        if (!this.currentImageId && !this.batchMode) return;
        
        let newWidth = parseInt(this.widthInput.value);
        let newHeight = parseInt(this.heightInput.value);
        
        if (isNaN(newWidth) || isNaN(newHeight)) return;
        
        if (this.keepAspectRatio.checked) {
            // 保持宽高比
            if (this.currentImageId) {
                const imageData = this.images.get(this.currentImageId);
                const aspectRatio = imageData.originalWidth / imageData.originalHeight;
                
                // 根据最后修改的输入框调整另一个值
                if (document.activeElement === this.widthInput) {
                    newHeight = Math.round(newWidth / aspectRatio);
                    this.heightInput.value = newHeight;
                } else if (document.activeElement === this.heightInput) {
                    newWidth = Math.round(newHeight * aspectRatio);
                    this.widthInput.value = newWidth;
                }
            }
        }
        
        if (this.batchMode) {
            // 批量模式：应用到所有图片
            this.images.forEach(imageData => {
                if (this.keepAspectRatio.checked) {
                    const aspectRatio = imageData.originalWidth / imageData.originalHeight;
                    imageData.currentWidth = newWidth;
                    imageData.currentHeight = Math.round(newWidth / aspectRatio);
                } else {
                    imageData.currentWidth = newWidth;
                    imageData.currentHeight = newHeight;
                }
                imageData.isModified = true;
                this.updateImageStatus(imageData.id);
            });
        } else {
            // 分别调节模式：只应用到当前图片
            if (this.currentImageId) {
                const imageData = this.images.get(this.currentImageId);
                if (imageData) {
                    imageData.currentWidth = newWidth;
                    imageData.currentHeight = newHeight;
                    imageData.isModified = true;
                    this.updateImageStatus(imageData.id);
                }
            }
        }
        
        // 更新预览
        this.updatePreview();
    }

    applyPresetSize(size) {
        if (this.keepAspectRatio.checked && this.currentImageId) {
            const imageData = this.images.get(this.currentImageId);
            const aspectRatio = imageData.originalWidth / imageData.originalHeight;
            
            this.widthInput.value = size;
            this.heightInput.value = Math.round(size / aspectRatio);
        } else {
            this.widthInput.value = size;
            this.heightInput.value = size;
        }
        
        this.updateSize();
    }

    updateImageStatus(imageId) {
        const imageItem = document.querySelector(`[data-image-id="${imageId}"]`);
        if (imageItem) {
            const status = imageItem.querySelector('.image-status');
            const imageData = this.images.get(imageId);
            
            if (imageData.isModified) {
                status.classList.add('modified');
            } else {
                status.classList.remove('modified');
            }
        }
    }

    // 重置功能
    resetCurrent() {
        if (!this.currentImageId) return;
        
        const imageData = this.images.get(this.currentImageId);
        if (imageData) {
            imageData.brightness = 100;
            imageData.currentWidth = imageData.originalWidth;
            imageData.currentHeight = imageData.originalHeight;
            imageData.isModified = false;
            
            this.updateControls();
            this.updatePreview();
            this.updateImageStatus(imageData.id);
        }
    }

    resetAll() {
        this.images.forEach(imageData => {
            imageData.brightness = 100;
            imageData.currentWidth = imageData.originalWidth;
            imageData.currentHeight = imageData.originalHeight;
            imageData.isModified = false;
            this.updateImageStatus(imageData.id);
        });
        
        this.updateControls();
        this.updatePreview();
    }

    // 下载功能
    downloadCurrent() {
        if (!this.currentImageId) return;
        
        const imageData = this.images.get(this.currentImageId);
        if (imageData && imageData.canvas) {
            this.downloadImage(imageData);
        }
    }

    downloadImage(imageData) {
        const link = document.createElement('a');
        const fileName = this.getDownloadFileName(imageData);
        
        imageData.canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(url);
        }, 'image/png', 0.95);
    }

    async downloadAll() {
        if (this.images.size === 0) return;
        
        for (const imageData of this.images.values()) {
            if (imageData.canvas) {
                this.downloadImage(imageData);
                // 添加延迟避免浏览器阻止多个下载
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }

    getDownloadFileName(imageData) {
        const nameWithoutExt = imageData.name.replace(/\.[^/.]+$/, '');
        const ext = imageData.name.split('.').pop() || 'png';
        
        let suffix = '';
        if (imageData.brightness !== 100) {
            suffix += `_brightness${imageData.brightness}`;
        }
        if (imageData.currentWidth !== imageData.originalWidth || 
            imageData.currentHeight !== imageData.originalHeight) {
            suffix += `_${imageData.currentWidth}x${imageData.currentHeight}`;
        }
        
        return `${nameWithoutExt}${suffix}.${ext}`;
    }

    // 清空功能
    clearAll() {
        if (confirm('确定要清空所有图片吗？')) {
            this.images.clear();
            this.imageList.innerHTML = '';
            this.currentImageId = null;
            this.updateImageCount();
            this.hideEditor();
            this.resetControls();
        }
    }

    // 界面控制
    showProgress() {
        this.uploadProgress.style.display = 'block';
    }

    hideProgress() {
        this.uploadProgress.style.display = 'none';
    }

    updateProgress(percent, text) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = text;
    }

    showEditor() {
        this.editorSection.style.display = 'block';
        this.editorSection.scrollIntoView({ behavior: 'smooth' });
    }

    hideEditor() {
        this.editorSection.style.display = 'none';
    }

    updateImageCount() {
        this.imageCount.textContent = this.images.size;
    }

    resetControls() {
        this.brightnessSlider.value = 100;
        this.brightnessInput.value = 100;
        this.widthInput.value = '';
        this.heightInput.value = '';
        this.currentImageName.textContent = '未选择图片';
        this.previewInfo.style.display = 'block';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new BatchImageProcessor();
});