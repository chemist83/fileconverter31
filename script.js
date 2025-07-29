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
    let originalImage = null; // Used for image conversions on canvas

    // Define conversion types available for each file type
    const CONVERSION_OPTIONS = {
        'image': [
            { value: 'image/png', label: 'PNG Görseline' },
            { value: 'image/jpeg', label: 'JPEG Görseline' },
            { value: 'image/webp', label: 'WebP Görseline' }
        ],
        'text': [ // For specific text file types (e.g., text/plain, application/json)
            { value: 'text_to_base64', label: 'Metinden Base64\'e' },
            { value: 'base64_to_text', label: 'Base64\'ten Metine' }
            // Add more client-side text conversions if feasible (e.g., Markdown to HTML, JSON to CSV)
        ],
        'application/zip': [
            { value: 'unzip', label: 'ZIP Dosyasını Aç' }
        ],
        'default': [ // Options for any other file type, primarily for general base64 conversion
            { value: 'to_base64', label: 'Dosyayı Base64\'e Çevir' }
        ]
    };

    /** Displays a message to the user. */
    function showMessage(msg, type = 'error') {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`; // Apply CSS class for styling
        messageDiv.style.display = 'block';
    }

    /** Hides any displayed message. */
    function hideMessage() {
        messageDiv.style.display = 'none';
    }

    /** Resets all result display areas and internal state. */
    function resetResultArea() {
        resultArea.style.display = 'none'; // Hide the main result container
        imagePreviewContainer.style.display = 'none';
        imagePreview.src = '';
        imageCanvas.style.display = 'none'; // Canvas can remain hidden mostly
        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height); // Clear canvas content
        zipContentListDiv.style.display = 'none';
        zipFileListUl.innerHTML = ''; // Clear ZIP file list
        textOutputArea.style.display = 'none';
        textOutput.value = ''; // Clear text output
        downloadLink.style.display = 'none';
        downloadLink.href = '#';
        downloadLink.download = 'converted_file';
        originalImage = null; // Clear loaded image
    }

    /** Populates the conversion type dropdown based on the selected file's MIME type. */
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
            // For any other file type, offer general options like Base64 encoding
            options = CONVERSION_OPTIONS['default'];
        }

        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            conversionTypeSelect.appendChild(opt);
        });

        // Enable/disable dropdown and button based on whether options are available
        conversionTypeSelect.disabled = options.length === 0;
        performConversionButton.disabled = options.length === 0;
    }

    // --- Event Listeners ---

    fileInput.addEventListener('change', async (event) => {
        currentFile = event.target.files[0];
        hideMessage();
        resetResultArea();

        if (currentFile) {
            selectedFileNameDisplay.textContent = `Seçilen Dosya: ${currentFile.name} (${(currentFile.size / 1024).toFixed(2)} KB)`;

            populateConversionOptions(currentFile.type);

            // Immediately preview images
            if (currentFile.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    imagePreviewContainer.style.display = 'block';
                    imagePreview.style.display = 'block'; 

                    originalImage = new Image();
                    originalImage.onload = () => {
                        imageCanvas.width = originalImage.width;
                        imageCanvas.height = originalImage.height;
                    };
                    originalImage.src = e.target.result;
                };
                reader.onerror = (e) => {
                    showMessage("Görsel önizlemesi yüklenemedi.", "error");
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
        performConversionButton.disabled = true; // Disable button during processing
        performConversionButton.textContent = "İşleniyor..."; // Show loading text

        try {
            resultArea.style.display = 'block'; // Make the main result container visible

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
            // Only show success if no specific error was thrown above
            if (messageDiv.style.display !== 'block' || messageDiv.classList.contains('success')) {
                showMessage("İşlem başarıyla tamamlandı!", "success");
            }


        } catch (error) {
            console.error("Dönüştürme/İşlem Hatası:", error);
            // If message isn't already set by a specific function, show general error
            if (messageDiv.style.display !== 'block' || messageDiv.classList.contains('success')) {
                 showMessage(`Bir hata oluştu: ${error.message}`, "error");
            }
        } finally {
            performConversionButton.disabled = false; // Re-enable button
            performConversionButton.textContent = "Dönüştür / İşlem Yap"; // Reset button text
        }
    });

    // --- Client-Side Conversion Functions ---

    /** Handles image format conversion (JPG, PNG, WebP). */
    async function convertImage(file, targetFormat) {
        if (!originalImage) {
            showMessage("Görsel yüklenirken bir hata oluştu veya görsel geçerli değil.", "error");
            throw new Error("Invalid image for conversion.");
        }

        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        ctx.drawImage(originalImage, 0, 0, imageCanvas.width, imageCanvas.height);

        // Quality (0-1) only applies to image/jpeg and image/webp
        const quality = 0.9; 

        try {
            const dataURL = imageCanvas.toDataURL(targetFormat, quality);

            downloadLink.href = dataURL;
            // Infer filename extension from targetFormat (e.g., "png" from "image/png")
            const extension = targetFormat.split('/')[1].split('+')[0];
            const originalFileName = file.name.split('.')[0];
            downloadLink.download = `${originalFileName}_converted.${extension}`;
            downloadLink.style.display = 'inline-block'; // Make download link visible
            imagePreviewContainer.style.display = 'block'; // Show image preview container
            imagePreview.src = dataURL; // Update preview with converted image
        } catch (error) {
            console.error("Image conversion error:", error);
            showMessage(`Görsel dönüştürülürken hata oluştu: ${error.message}. Desteklenmeyen bir format olabilir.`, "error");
            throw error; // Re-throw to be caught by the main try/catch
        }
    }

    /** Extracts and lists contents of a ZIP file, providing download links for each. */
    async function unzipFile(file) {
        try {
            const zip = new JSZip();
            const contents = await zip.loadAsync(file);

            zipContentListDiv.style.display = 'block'; // Show ZIP content list area
            zipFileListUl.innerHTML = ''; // Clear previous list

            let fileCount = 0;
            // Iterate through files in the ZIP archive
            for (const filename in contents.files) {
                if (!contents.files[filename].dir) { // Only process actual files (not directories)
                    fileCount++;
                    const li = document.createElement('li');
                    const downloadBtn = document.createElement('a');
                    downloadBtn.textContent = filename;
                    downloadBtn.href = '#'; // Placeholder
                    downloadBtn.title = `İndirmek için tıklayın: ${filename}`;
                    downloadBtn.onclick = async () => {
                        try {
                            const blob = await contents.files[filename].async("blob");
                            saveAs(blob, filename); // Uses FileSaver.js to trigger download
                            return false; // Prevent default link behavior
                        } catch (downloadError) {
                            console.error("Error downloading file from ZIP:", downloadError);
                            showMessage(`'${filename}' indirilirken hata oluştu: ${downloadError.message}`, "error");
                            return false;
                        }
                    };
                    li.appendChild(downloadBtn);
                    zipFileListUl.appendChild(li);
                }
            }

            if (fileCount === 0) {
                zipFileListUl.innerHTML = '<li>Bu ZIP dosyası boş veya sadece klasör içeriyor.</li>';
            }
            // No single downloadLink for the whole ZIP, individual links are provided.
        } catch (error) {
            console.error("ZIP processing error:", error);
            showMessage("ZIP dosyası açılamadı. Geçerli bir ZIP dosyası olduğundan emin olun veya bozuk olabilir.", "error");
            throw error;
        }
    }

    /** Converts any file's content to a Base64 string. */
    async function convertFileToBase64(file) {
        try {
            const reader = new FileReader();
            // Using a Promise to handle FileReader's async nature
            const base64Promise = new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(reader.error);
                reader.readAsDataURL(file); // Reads any file type as data URL (Base64 encoded)
            });

            const dataURL = await base64Promise;
            const base64String = dataURL.split(',')[1]; // Get only the Base64 part

            textOutputArea.style.display = 'block'; // Show text output area
            textOutput.value = base64String;

            const blob = new Blob([base64String], { type: 'text/plain' });
            const originalFileName = file.name.split('.')[0];

            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = `${originalFileName}_base64.txt`;
            downloadLink.style.display = 'inline-block'; // Make download link visible
        } catch (error) {
            console.error("Base64 encoding error:", error);
            showMessage(`Dosya Base64'e dönüştürülürken hata oluştu: ${error.message}`, "error");
            throw error;
        }
    }

    /** Decodes a Base64 string from a text file back into plain text. */
    async function convertBase64ToText(file) {
        try {
            const reader = new FileReader();
            const textPromise = new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(reader.error);
                reader.readAsText(file); // Read the file as plain text (expecting Base64 string)
            });

            const base64Content = await textPromise;

            // Basic validation for Base64 format (optional but good practice)
            if (!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64Content.trim())) {
                throw new Error("Girdi geçerli bir Base64 metni gibi görünmüyor.");
            }

            const decodedText = atob(base64Content.trim()); // Decode the Base64 string

            textOutputArea.style.display = 'block'; // Show text output area
            textOutput.value = decodedText;

            const blob = new Blob([decodedText], { type: 'text/plain' });
            const originalFileName = file.name.split('.')[0];

            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = `${originalFileName}_decoded.txt`;
            downloadLink.style.display = 'inline-block'; // Make download link visible

        } catch (error) {
            console.error("Base64 decoding error:", error);
            showMessage(`Base64'ten metine dönüştürülürken hata oluştu: ${error.message}. Geçerli bir Base64 metni olduğundan emin olun.`, "error");
            throw error;
        }
    }
});
