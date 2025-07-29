document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const selectedFileNameDisplay = document.getElementById('selectedFileName');
    const conversionTypeSelect = document.getElementById('conversionType');
    const performConversionButton = document.getElementById('performConversion');
    const resultArea = document.getElementById('resultArea');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const imageCanvas = document.getElementById('imageCanvas');
    const ctx = imageCanvas.getContext('2d');
    const zipContentListDiv = document.getElementById('zipContentList');
    const zipFileListUl = document.getElementById('zipFileList');
    const textOutputArea = document.getElementById('textOutputArea');
    const textOutput = document.getElementById('textOutput');
    const downloadLink = document.getElementById('downloadLink');
    const messageDiv = document.getElementById('message');

    let currentFile = null;
    let originalImage = null; // Used for image conversions

    // Define conversion types available for each file type
    const CONVERSION_OPTIONS = {
        'image': [
            { value: 'image/png', label: 'PNG Görseline' },
            { value: 'image/jpeg', label: 'JPEG Görseline' },
            { value: 'image/webp', label: 'WebP Görseline' }
        ],
        'text': [
            { value: 'text_to_base64', label: 'Metinden Base64\'e' },
            { value: 'base64_to_text', label: 'Base64\'ten Metine' }
        ],
        'application/zip': [
            { value: 'unzip', label: 'ZIP Dosyasını Aç' }
        ],
        'default': [ // Options for unknown or general file types
            { value: 'to_base64', label: 'Dosyayı Base64\'e Çevir' }
        ]
    };

    function showMessage(msg, type = 'error') {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
    }

    function hideMessage() {
        messageDiv.style.display = 'none';
    }

    function resetResultArea() {
        resultArea.style.display = 'none';
        imagePreviewContainer.style.display = 'none';
        imagePreview.src = '';
        imageCanvas.style.display = 'none'; // Canvas can remain hidden mostly
        zipContentListDiv.style.display = 'none';
        zipFileListUl.innerHTML = '';
        textOutputArea.style.display = 'none';
        textOutput.value = '';
        downloadLink.style.display = 'none';
        downloadLink.href = '#';
        downloadLink.download = 'converted_file';
        originalImage = null;
    }

    function populateConversionOptions(fileType) {
        conversionTypeSelect.innerHTML = '<option value="">Dönüştürme Seçeneği Seçin</option>';
        let options = [];

        if (fileType.startsWith('image/')) {
            options = CONVERSION_OPTIONS['image'];
        } else if (fileType.startsWith('text/') || fileType === 'application/json' || fileType === 'application/xml') {
            options = CONVERSION_OPTIONS['text'];
        } else if (fileType === 'application/zip') {
            options = CONVERSION_OPTIONS['application/zip'];
        } else {
            // For any other file type, offer general options like Base64
            options = CONVERSION_OPTIONS['default'];
        }

        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            conversionTypeSelect.appendChild(opt);
        });

        conversionTypeSelect.disabled = !fileType;
        performConversionButton.disabled = !fileType;
    }

    // --- Event Listeners ---
    fileInput.addEventListener('change', async (event) => {
        currentFile = event.target.files[0];
        hideMessage();
        resetResultArea();

        if (currentFile) {
            selectedFileNameDisplay.textContent = `Seçilen Dosya: ${currentFile.name} (${(currentFile.size / 1024).toFixed(2)} KB)`;

            populateConversionOptions(currentFile.type);

            // Preview images immediately
            if (currentFile.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    imagePreviewContainer.style.display = 'block';
                    imagePreview.style.display = 'block'; // Make sure the img tag is visible

                    originalImage = new Image();
                    originalImage.onload = () => {
                        imageCanvas.width = originalImage.width;
                        imageCanvas.height = originalImage.height;
                    };
                    originalImage.src = e.target.result;
                };
                reader.readAsDataURL(currentFile);
            }

        } else {
            selectedFileNameDisplay.textContent = "Henüz dosya seçilmedi.";
            populateConversionOptions(''); // Clear options
            conversionTypeSelect.disabled = true;
            performConversionButton.disabled = true;
        }
    });

    performConversionButton.addEventListener('click', async () => {
        if (!currentFile) {
            showMessage("Lütfen önce bir dosya seçin.");
            return;
        }

        const selectedConversion = conversionTypeSelect.value;
        if (!selectedConversion) {
            showMessage("Lütfen bir dönüştürme seçeneği seçin.");
            return;
        }

        hideMessage();
        resetResultArea(); // Reset results area for new conversion
        performConversionButton.disabled = true; // Disable during conversion
        performConversionButton.textContent = "İşleniyor...";

        try {
            resultArea.style.display = 'block'; // Show result area container

            if (currentFile.type.startsWith('image/') && selectedConversion.startsWith('image/')) {
                await convertImage(currentFile, selectedConversion);
            } else if (currentFile.type === 'application/zip' && selectedConversion === 'unzip') {
                await unzipFile(currentFile);
            } else if (selectedConversion === 'text_to_base64' || selectedConversion === 'to_base64') {
                await convertFileToBase64(currentFile);
            } else if (selectedConversion === 'base64_to_text') {
                await convertBase64ToText(currentFile);
            }
            else {
                showMessage("Bu dönüştürme seçeneği desteklenmiyor veya henüz uygulanmadı.", "error");
            }
            showMessage("İşlem başarıyla tamamlandı!", "success");

        } catch (error) {
            console.error("Dönüştürme/İşlem Hatası:", error);
            showMessage(`Bir hata oluştu: ${error.message}`);
        } finally {
            performConversionButton.disabled = false;
            performConversionButton.textContent = "Dönüştür / İşlem Yap";
        }
    });

    // --- Client-Side Conversion Functions ---

    async function convertImage(file, targetFormat) {
        if (!originalImage) {
            showMessage("Görsel yüklenirken bir hata oluştu.", "error");
            return;
        }

        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        ctx.drawImage(originalImage, 0, 0, imageCanvas.width, imageCanvas.height);

        // Get the image data in the desired format
        // Quality (0-1) only applies to image/jpeg and image/webp
        let quality = 0.9;
        if (targetFormat === 'image/jpeg' || targetFormat === 'image/webp') {
             quality = 0.9; // You can add a UI element for quality if needed
        }

        const dataURL = imageCanvas.toDataURL(targetFormat, quality);

        downloadLink.href = dataURL;
        // Infer filename extension from targetFormat
        const extension = targetFormat.split('/')[1].split('+')[0]; // Handles "image/jpeg" or "image/svg+xml"
        const originalFileName = file.name.split('.')[0];
        downloadLink.download = `${originalFileName}_converted.${extension}`;
        downloadLink.style.display = 'inline-block';
        imagePreviewContainer.style.display = 'block';
        imagePreview.src = dataURL; // Show converted image in preview
    }

    async function unzipFile(file) {
        try {
            const zip = new JSZip();
            const contents = await zip.loadAsync(file);

            zipContentListDiv.style.display = 'block';
            zipFileListUl.innerHTML = ''; // Clear previous list

            let fileCount = 0;
            for (const filename in contents.files) {
                if (!contents.files[filename].dir) { // Only list files, not directories
                    fileCount++;
                    const li = document.createElement('li');
                    const downloadBtn = document.createElement('a');
                    downloadBtn.textContent = filename;
                    downloadBtn.href = '#'; // Placeholder
                    downloadBtn.onclick = async () => {
                        const blob = await contents.files[filename].async("blob");
                        saveAs(blob, filename); // Uses FileSaver.js
                        return false; // Prevent default link behavior
                    };
                    li.appendChild(downloadBtn);
                    zipFileListUl.appendChild(li);
                }
            }

            if (fileCount === 0) {
                zipFileListUl.innerHTML = '<li>Bu ZIP dosyası boş veya sadece klasör içeriyor.</li>';
            }
        } catch (error) {
            console.error("ZIP açma hatası:", error);
            showMessage("ZIP dosyası açılamadı. Geçerli bir ZIP dosyası olduğundan emin olun.", "error");
        }
    }

    async function convertFileToBase64(file) {
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                // The result is already a data URL (base64 encoded for binary files)
                // For text files, readAsDataURL gives base64 of the text.
                // For direct binary base64, readAsBinaryString and btoa is more direct.
                // Let's use readAsDataURL for simplicity and wider file type support.
                const base64String = e.target.result.split(',')[1]; // Get only the base64 part

                textOutputArea.style.display = 'block';
                textOutput.value = base64String;

                const blob = new Blob([base64String], { type: 'text/plain' });
                const originalFileName = file.name.split('.')[0];

                downloadLink.href = URL.createObjectURL(blob);
                downloadLink.download = `${originalFileName}_base64.txt`;
                downloadLink.style.display = 'inline-block';
            };
            reader.onerror = (e) => {
                showMessage("Dosya okunurken hata oluştu (Base64'e dönüştürme): " + reader.error, "error");
            };
            reader.readAsDataURL(file); // Reads any file type as data URL (base64 encoded)
        } catch (error) {
            showMessage("Dosya Base64'e dönüştürülürken hata oluştu: " + error.message, "error");
        }
    }

    async function convertBase64ToText(file) {
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Content = e.target.result;
                try {
                    // Try to decode assuming it's just the base64 string
                    let decodedText = atob(base64Content);

                    // If the original file was a data URL (e.g., image data URL), atob won't work directly
                    // It means the input isn't pure base64 text, but a base64 encoded file.
                    // This scenario is for a text file whose *content* is base64.
                    if (!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64Content)) {
                        throw new Error("Geçerli bir Base64 metni gibi görünmüyor.");
                    }


                    textOutputArea.style.display = 'block';
                    textOutput.value = decodedText;

                    const blob = new Blob([decodedText], { type: 'text/plain' });
                    const originalFileName = file.name.split('.')[0];

                    downloadLink.href = URL.createObjectURL(blob);
                    downloadLink.download = `${originalFileName}_decoded.txt`;
                    downloadLink.style.display = 'inline-block';

                } catch (decodeError) {
                    showMessage("Base64 metni çözülürken hata oluştu. Geçerli bir Base64 stringi olduğundan emin olun: " + decodeError.message, "error");
                }
            };
            reader.onerror = (e) => {
                showMessage("Dosya okunurken hata oluştu (Base64'ten metine dönüştürme): " + reader.error, "error");
            };
            reader.readAsText(file); // Read as text as we expect base64 string
        } catch (error) {
            showMessage("Base64'ten metine dönüştürülürken hata oluştu: " + error.message, "error");
        }
    }
});
