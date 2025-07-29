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

    // Yeni: Görsel yükleme durumunu göstermek için bir span ekledik (index.html'e de eklemelisin eğer yoksa)
    const imageLoadingStatus = document.createElement('span');
    imageLoadingStatus.id = 'imageLoadingStatus';
    imageLoadingStatus.style.display = 'none';
    imageLoadingStatus.style.color = 'orange';
    imageLoadingStatus.style.fontSize = '0.9em';
    imageLoadingStatus.textContent = 'Görsel yükleniyor...';
    selectedFileNameDisplay.parentNode.insertBefore(imageLoadingStatus, selectedFileNameDisplay.nextSibling);


    let currentFile = null;
    let originalImage = null; // Used for image conversions on canvas
    let imageLoadPromise = null; // Görselin yüklenip yüklenmediğini takip etmek için

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
        imageLoadPromise = null; // Reset image load promise
        imageLoadingStatus.style.display = 'none'; // Hide loading status
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
            options = CONVERSION_OPTIONS['default'];
        }

        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            conversionTypeSelect.appendChild(opt);
        });

        conversionTypeSelect.disabled = options.length === 0;
        performConversionButton.disabled = options.length === 0;
    }

    // --- Event Listeners ---

    fileInput.addEventListener('change', async (event) => {
        currentFile = event.target.files[0];
        hideMessage();
        resetResultArea(); // Tüm sonuç ve yükleme durumlarını sıfırla

        if (currentFile) {
            selectedFileNameDisplay.textContent = `Seçilen Dosya: ${currentFile.name} (${(currentFile.size / 1024).toFixed(2)} KB)`;

            populateConversionOptions(currentFile.type);

            if (currentFile.type.startsWith('image/')) {
                imageLoadingStatus.style.display = 'inline'; // Görsel yükleme durumunu göster

                imageLoadPromise = new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        imagePreview.src = e.target.result;
                        imagePreviewContainer.style.display = 'block';
                        imagePreview.style.display = 'block'; 

                        originalImage = new Image();
                        originalImage.onload = () => {
                            imageCanvas.width = originalImage.width;
                            imageCanvas.height = originalImage.height;
                            imageLoadingStatus.style.display = 'none'; // Yüklendiğinde gizle
                            resolve(); // Promise'i çöz
                        };
                        originalImage.onerror = () => { // Görselin kendisi yüklenirken hata olursa
                            imageLoadingStatus.style.display = 'none';
                            showMessage("Görsel önizlemesi yüklenemedi veya bozuk.", "error");
                            originalImage = null;
                            reject(new Error("Görsel geçerli değil veya yüklenemedi.")); // Promise'i reddet
                        };
                        originalImage.src = e.target.result;
                    };
                    reader.onerror = (e) => { // FileReader hatası olursa
                        imageLoadingStatus.style.display = 'none';
                        showMessage("Dosya okunurken hata oluştu. Lütfen geçerli bir dosya yükleyin.", "error");
                        originalImage = null;
                        reject(new Error("Dosya okuma hatası.")); // Promise'i reddet
                    };
                    reader.readAsDataURL(currentFile);
                });
            } else {
                imageLoadingStatus.style.display = 'none'; // Görsel değilse yükleme durumunu gizle
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
            // Eğer görsel yüklüyorsak, görselin yüklenmesini bekle
            if (currentFile.type.startsWith('image/') && imageLoadPromise) {
                await imageLoadPromise; // Görselin başarılı bir şekilde yüklendiğinden emin ol
                if (!originalImage) { // Promise çözüldü ama görsel hala nullsa bir hata var demektir
                    throw new Error("Görsel hazırlığı tamamlanamadı. Lütfen tekrar deneyin.");
                }
            }
            
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
                // Hata mesajı zaten gösterildiği için burada throw etmiyoruz, sadece finally'ye geçiyoruz
            }
            
            // Eğer üstteki if/else blokları bir hata fırlatmadıysa ve mesaj gösterilmediyse başarı mesajı göster
            if (messageDiv.style.display !== 'block' || messageDiv.classList.contains('success')) {
                showMessage("İşlem başarıyla tamamlandı!", "success");
            }


        } catch (error) {
            console.error("Dönüştürme/İşlem Hatası:", error);
            // Eğer mesaj zaten belirli bir hata fonksiyonu tarafından ayarlanmamışsa genel hata mesajını göster
            if (messageDiv.style.display !== 'block' || messageDiv.classList.contains('success')) {
                 showMessage(`Bir hata oluştu: ${error.message}. Lütfen tarayıcı konsolunu kontrol edin.`, "error");
            }
        } finally {
            performConversionButton.disabled = false; // Re-enable button
            performConversionButton.textContent = "Dönüştür / İşlem Yap"; // Reset button text
        }
    });

    // --- Client-Side Conversion Functions ---

    /** Handles image format conversion (JPG, PNG, WebP). */
    async function convertImage(file, targetFormat) {
        if (!originalImage) { // Bu kontrol artık teorik olarak imageLoadPromise sayesinde daha az tetiklenmeli
            showMessage("Dönüştürme için geçerli görsel bulunamadı.", "error");
            throw new Error("Invalid image for conversion (originalImage is null).");
        }

        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        ctx.drawImage(originalImage, 0, 0, imageCanvas.width, imageCanvas.height);

        const quality = 0.9; 

        try {
            const dataURL = imageCanvas.toDataURL(targetFormat, quality);

            downloadLink.href = dataURL;
            const extension = targetFormat.split('/')[1].split('+')[0];
            const originalFileName = file.name.split('.')[0];
            downloadLink.download = `${originalFileName}_converted.${extension}`;
            downloadLink.style.display = 'inline-block';
            imagePreviewContainer.style.display = 'block';
            imagePreview.src = dataURL;
        } catch (error) {
            console.error("Image conversion error:", error);
            showMessage(`Görsel dönüştürülürken hata oluştu: ${error.message}. Desteklenmeyen bir format olabilir.`, "error");
            throw error;
        }
    }

    /** Extracts and lists contents of a ZIP file, providing download links for each. */
    async function unzipFile(file) {
        try {
            const zip = new JSZip();
            const contents = await zip.loadAsync(file);

            zipContentListDiv.style.display = 'block';
            zipFileListUl.innerHTML = '';

            let fileCount = 0;
            for (const filename in contents.files) {
                if (!contents.files[filename].dir) {
                    fileCount++;
                    const li = document.createElement('li');
                    const downloadBtn = document.createElement('a');
                    downloadBtn.textContent = filename;
                    downloadBtn.href = '#';
                    downloadBtn.title = `İndirmek için tıklayın: ${filename}`;
                    downloadBtn.onclick = async () => {
                        try {
                            const blob = await contents.files[filename].async("blob");
                            saveAs(blob, filename);
                            return false;
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
            const base64Promise = new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(reader.error);
                reader.readAsDataURL(file);
            });

            const dataURL = await base64Promise;
            const base64String = dataURL.split(',')[1];

            textOutputArea.style.display = 'block';
            textOutput.value = base64String;

            const blob = new Blob([base64String], { type: 'text/plain' });
            const originalFileName = file.name.split('.')[0];

            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = `${originalFileName}_base64.txt`;
            downloadLink.style.display = 'inline-block';
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
                reader.readAsText(file);
            });

            const base64Content = await textPromise;

            if (!base64Content.trim().match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)) {
                throw new Error("Girdi geçerli bir Base64 metni gibi görünmüyor. Lütfen sadece Base64 stringi içeren bir dosya yükleyin.");
            }

            const decodedText = atob(base64Content.trim());

            textOutputArea.style.display = 'block';
            textOutput.value = decodedText;

            const blob = new Blob([decodedText], { type: 'text/plain' });
            const originalFileName = file.name.split('.')[0];

            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = `${originalFileName}_decoded.txt`;
            downloadLink.style.display = 'inline-block';

        } catch (error) {
            console.error("Base64 decoding error:", error);
            showMessage(`Base64'ten metine dönüştürülürken hata oluştu: ${error.message}. Geçerli bir Base64 metni olduğundan emin olun.`, "error");
            throw error;
        }
    }
});
