const { TranscribeStreamingClient, StartStreamTranscriptionCommand } = require("@aws-sdk/client-transcribe-streaming");
const mic = require("microphone-stream").default;

const LanguageCode = "en-US";
const MediaEncoding = "pcm";
const MediaSampleRateHertz = "44100";
const region = "us-east-1"
const credentials = {
  "accessKeyId": "AKIA3IAUOEG72OSPCS7U",
  "secretAccessKey": "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",
};

var uploadedFile = ""
var fileType = ""
var fileName = ""
var base64Data = ""

$(document).ready(function() {
	$query = $("#Input")
	$form = $("#searchBarForm")
	$searchContainer = $("#search")
	$uploadModal = $("#uploadModal")
	$uploadButton = $("#uploadButton")
	$cancelButton = $("#modalCancelButton")
	$submitButton = $("#modalSubmitButton")
	$fileInput = $("#fileInput")
	
	$micIcon = $("#microphone")
	var micIconClicked = false
	
	$micIcon.click(function() {
		updateMic();
	})
	
	$submitButton.click(function() {
		if (uploadedFile !== "") {
		  	// if (file.type && !file.type.startsWith('image/')) {
// 		    	console.log('File is not an image.', file.type, file);
// 		    	return;
// 		  	}
			
		  	const reader = new FileReader();
		  	reader.addEventListener('load', (event) => {
		    	console.log(event)
	// 			data = new Buffer(event.target.result, "binary")
	// 			console.log(data)
				data = event.target.result
				base64Data = new Buffer.from(data.replace(/^data:image\/\w+;base64,/, ""), 'base64');
			
		
				// const params = {
	// 				Bucket: "storagebucket17",
	// 				Key: fileName,
	// 				Body: new Buffer.from(event.target.result.replace(/^data:image\/\w+;base64,/, ""), 'base64'),
	// 				ContentEncoding: 'base64',
	// 				ContentType: fileType
	// 			}
	// 			s3.upload(params)
		  	});
		  	reader.readAsDataURL(uploadedFile);
			
			delay(2000).then(() => uploadImage(base64Data))
		}
		else {
			alert("You have no selected an image")
		}
	})
	
	$cancelButton.click(function() {
		$uploadModal.css("visibility", "hidden")
		$fileInput.val("")
	})
	
	$fileInput.change(function(event) {
		console.log(event.target.files[0])
		uploadedFile = event.target.files[0]
		const fileName = uploadedFile.name;
	    const fileType = uploadedFile.type;
		console.log(fileType)
		console.log(fileName)
	})
	
	function updateMic() {
		if (micIconClicked == false) {
			$micIcon.attr("src", "mic_iconClicked.png")
			$micIcon.toggleClass("blink-image", true)
			micIconClicked = true
		
			navigator.mediaDevices.getUserMedia({ audio: true, video: false })
				.then(handleSuccess)
		}
		else {
			$micIcon.attr("src", "mic_icon.png")
			$micIcon.toggleClass("blink-image", false)
			micIconClicked = false
		}
	}
	
	const pcmEncodeChunk = (chunk) => {
	  	const input = mic.toRaw(chunk)
	  	var offset = 0;
	  	var buffer = new ArrayBuffer(input.length * 2);
	  	var view = new DataView(buffer);
	  	for (var i = 0; i < input.length; i++, offset += 2) {
	    	var s = Math.max(-1, Math.min(1, input[i]));
	    	view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
	  	}
	  	return Buffer.from(buffer);
	};
	
	function delay(time) {
		return new Promise(resolve => setTimeout(resolve, time));
	}
	
	const handleSuccess = async function(stream) {
		micStream = new mic()
		
		micStream.on("format", function(data) {
			inputSampleRate = data.sampleRate;
		})
		
		micStream.setStream(stream)
		
		const client = new TranscribeStreamingClient({
			region,
			credentials
		});

	  	const params = {
		  	LanguageCode,
		  	MediaEncoding,
		  	MediaSampleRateHertz,
		  	AudioStream: (async function* () {
			  	for await (const chunk of micStream) {
				  	yield {AudioEvent: {AudioChunk: pcmEncodeChunk(chunk)}};
			  	}
		  	})(),
	  	};

		const command = new StartStreamTranscriptionCommand(params);
		const response = await client.send(command);

  		try {
    		for await (const event of response.TranscriptResultStream) {
				if (event.TranscriptEvent) {
				    const message = event.TranscriptEvent;
				    // Get multiple possible results
				    const results = event.TranscriptEvent.Transcript.Results;
				    // Print all the possible transcripts
				    results.map((result) => {
				      (result.Alternatives || []).map((alternative) => {
				        const transcript = alternative.Items.map((item) => item.Content).join(" ");
						
						var output = modifyString(transcript)
						
						$query.val(output)
						
						const objectArray = Object.entries(message.Transcript.Results)
						const details = Object.entries(objectArray[0][1])
						
						details.forEach(([key, value]) => {
							if (key == "IsPartial" && value == false) {
								micStream.stop()
								updateMic()
								delay(2000).then(() => searchImages())
							}
						});
				      });
				    });
				  }
    		}
  		} catch(err) {
    		console.log("error")
    		console.log(err)
  		}
	};
	
    $(window).on('keydown', function(e) {
		if (e.which == 13) {
			searchImages()
			return false
		}
    })
	
	$form.submit(function(e) {
		e.preventDefault();
		return searchImages();
	})
	
	$uploadButton.click(function() {
		$uploadModal.css("visibility", "visible")
	})
	
	function searchImages() {
		imagesContainer = document.getElementById("imageContainer")
		imagesContainer.innerHTML = ''
		
		newRow = document.createElement("div")
		newRow.classList.add("rowContainer")

		imagesContainer.appendChild(newRow)
		
		if ($query.val() === "") {
			return
		}
		else {
			sdk.searchGet({"q": $query.val()}, {}, {})
				.then(function(result) {
					if(result.status == 200) {
						console.log(result);
						
						photos = JSON.parse(result.data.body)
						
						for(var i = 0; i < photos.length; ++i) {
							$rowContainer = $(".rowContainer").last()
							
							const image = document.createElement("img")
							image.classList.add("resultContainer")
							image.src = photos[i]

							if ((i + 1) % 6 == 0) {
								newRow = document.createElement("div")
								newRow.classList.add("rowContainer")
								
								$rowContainer.after(newRow)
								$rowContainer = $(".rowContainer").last()
								$rowContainer.attr("src", image)
							}
							else {
								$rowContainer.append(image)
							}
						}
					}
					else {
						console.log(result.status)
					}
				})

				$query.val("");
		}
	}
	
	function uploadImage(file) {
		var s3 = new AWS.S3(credentials);

		var params = {
			Body: file,
			Bucket: "storagebucket17",
			Key: uploadedFile.name
		}

		s3.putObject(params, function(err, data) {
		   	if (err) {
				console.log(err, err.stack);
				alert("Could not upload image. Please try again.")
			}
		   	else {
				console.log(data);
				alert("Successfuly uploaded image!")
		   	}
		 });
	}
})