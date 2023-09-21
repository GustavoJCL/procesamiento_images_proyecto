// import { resolve } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/tauri";

enum ButtonOptions {
	imageEnhance = "image-enhance",
	imageRestoration = "image-restoration",
	morphologicalErosion = "morphological-erosion",
	morphologicalDilation = "morphological-dilation",
	denoisingGausian = "denoising-gausian",
	denoisingNlm = "denoising-nlm",
	segmentation = "segmentation",
}

let greetInputEl: HTMLInputElement | null;
let greetMsgEl: HTMLElement | null;

let enumOtions: ButtonOptions;

let dropArea: HTMLElement | null;
let inputFile: HTMLInputElement | null;
let imageView: HTMLElement | null;
let captureImg: HTMLButtonElement | null;
let divOptions: NodeListOf<HTMLElement> | null;
let imgDisplay: HTMLImageElement | null;

let image_enhance_btn: HTMLButtonElement | null;
let image_restoration_btn: HTMLButtonElement | null;
let morphological_erosion_btn: HTMLButtonElement | null;
let morphological_dilation_btn: HTMLButtonElement | null;
let denoising_gausian_btn: HTMLButtonElement | null;
let denoising_nlm_btn: HTMLButtonElement | null;
let segmentation_btn: HTMLButtonElement | null;

let imgProcessBtn: HTMLButtonElement | null;

async function greet() {
	if (greetMsgEl && greetInputEl) {
		// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
		greetMsgEl.textContent = await invoke("greet", {
			name: greetInputEl.value,
		});
	}
}

async function imageEnhanceProcess() {
	const base64String = await convertImgToBase64();
	const amt: HTMLInputElement | null = document.getElementById(
		"amt",
	) as HTMLInputElement;
	const amt_value = amt ? parseInt(amt.value, 10) : 0;
	console.log("hola esquizo :u");

	const returnBase64String: String = await invoke("image_enhance", {
		image_data_base64: base64String,
		amt: amt_value,
	});

	// console.log(returnBase64String);
	if (imgDisplay) {
		console.log("praise the omnissiah");
		// imgDisplay.src = base64String;
		imgDisplay.src = returnBase64String as string;
		console.log(imgDisplay);
	}
}

async function imageRestorationProcess() {
	const base64String = await convertImgToBase64();
	const brightness: HTMLInputElement | null = document.getElementById(
		"brightness",
	) as HTMLInputElement;
	const contrast: HTMLInputElement | null = document.getElementById(
		"contrast",
	) as HTMLInputElement;

	const brightness_value = brightness ? parseInt(brightness.value, 10) : 0;
	const contrast_value = contrast ? parseInt(contrast.value, 10) : 0;
	const returnBase64String: String = await invoke("restore_image", {
		image_data_base64: base64String,
		brightness: brightness_value,
		contrast: contrast_value,
	});

	if (imgDisplay) imgDisplay.src = returnBase64String as string;
}

async function morphologicalErosionProcess() {
	const base64String = await convertImgToBase64();
	const k_erosion: HTMLInputElement | null = document.getElementById(
		"k-erosion",
	) as HTMLInputElement;
	const k_erosion_value = k_erosion ? parseInt(k_erosion.value, 10) : 0;
	const returnBase64String: String = await invoke("morphological_erosion", {
		image_data_base64: base64String,
		k: k_erosion_value,
	});
	if (imgDisplay)
		imgDisplay.src = `data:image/png;base64,${returnBase64String}`;
}

async function morphologicalDilationProcess() {
	const base64String = await convertImgToBase64();
	const k_dilation: HTMLInputElement | null = document.getElementById(
		"k-dilation",
	) as HTMLInputElement;
	const k_dilation_value = k_dilation ? parseInt(k_dilation.value, 10) : 0;
	const returnBase64String: String = await invoke("morphological_dilation", {
		image_data_base64: base64String,
		k: k_dilation_value,
	});
	if (imgDisplay)
		imgDisplay.src = `data:image/png;base64,${returnBase64String}`;
}

async function denoisingGausianProcess() {
	const base64String = await convertImgToBase64();
	const radius: HTMLInputElement | null = document.getElementById(
		"radius",
	) as HTMLInputElement;
	const radius_value = radius ? parseInt(radius.value, 10) : 0;
	const returnBase64String: String = await invoke(
		"denoising_image_gausian_blur",
		{
			image_data_base64: base64String,
			radius: radius_value,
		},
	);
	if (imgDisplay) imgDisplay.src = returnBase64String as string;
}

async function denoisingNlmProcess() {
	const base64String = await convertImgToBase64();
	const window_size: HTMLInputElement | null = document.getElementById(
		"window_size",
	) as HTMLInputElement;
	const h: HTMLInputElement | null = document.getElementById(
		"h",
	) as HTMLInputElement;
	const window_size_value = window_size ? parseInt(window_size.value, 10) : 0;
	const h_value = h ? parseInt(h.value, 10) : 0;
	const returnBase64String: String = await invoke("denoising_image_nlm", {
		image_data_base64: base64String,
		window_size: window_size_value,
		h: h_value,
	});
	if (imgDisplay)
		imgDisplay.src = `data:image/png;base64,${returnBase64String}`;
}

async function segmentationProcess() {
	const base64String = await convertImgToBase64();
	const k_segmentation: HTMLInputElement | null = document.getElementById(
		"k-segmentation",
	) as HTMLInputElement;
	const k_segmentation_value = k_segmentation
		? parseInt(k_segmentation.value, 10)
		: 0;
	const returnBase64String: String = await invoke("segment_image", {
		image_data_base64: base64String,
		threshold: k_segmentation_value,
	});
	if (imgDisplay) imgDisplay.src = returnBase64String as string;
}

async function convertImgToBase64(): Promise<string> {
	return new Promise((resolve, reject) => {
		let file: File | null = null;
		if (inputFile?.files) file = inputFile?.files[0];
		const reader = new FileReader();
		reader.onloadend = function () {
			if (typeof reader.result === "string") {
				resolve(reader.result.split(",")[1]);
			} else {
				reject("Unexpected result type");
			}
		};
		reader.onerror = reject;
		if (file) reader.readAsDataURL(file);
	});
}

function showDiv(id: String) {
	if (divOptions)
		divOptions.forEach((div) => {
			if (div.id === id) {
				div.style.display = "block";
			} else {
				div.style.display = "none";
			}
		});
}

window.addEventListener("DOMContentLoaded", () => {
	greetInputEl = document.querySelector("#greet-input");
	greetMsgEl = document.querySelector("#greet-msg");

	dropArea = document.querySelector("#drop-area");
	inputFile = document.querySelector("#input-file");
	imageView = document.querySelector("#img-view");
	captureImg = document.querySelector("#capture-btn");
	imgDisplay = document.querySelector("#img-display");

	divOptions = document.querySelectorAll<HTMLElement>("#div-options div");

	image_enhance_btn = document.querySelector("#image-enhance");
	image_restoration_btn = document.querySelector("#image-restoration");
	morphological_erosion_btn = document.querySelector("#morphological-erosion");
	morphological_dilation_btn = document.querySelector(
		"#morphological-dilation",
	);
	denoising_gausian_btn = document.querySelector("#denoising-gausian");
	denoising_nlm_btn = document.querySelector("#denoising-nlm");
	segmentation_btn = document.querySelector("#segmentation");

	imgProcessBtn = document.querySelector("#process-image");
	const uploadImage = () => {
		if (imageView && inputFile?.files) {
			const imgLink = URL.createObjectURL(inputFile.files[0]);
			// console.log(inputFile.files[0]);
			// console.log(imgLink);
			// imageView.style.backgroundImage = `url(${imgLink})`;
			imageView.style.backgroundImage = `url(${imgLink})`;
			imageView.textContent = " ";
			imageView.style.border = "0";
			console.log(imageView);
			console.log("hola esquizo btw");
		}
	};

	image_enhance_btn?.addEventListener("click", () => {
		showDiv("image-enhance-option");
		enumOtions = ButtonOptions.imageEnhance;
	});
	image_restoration_btn?.addEventListener("click", () => {
		showDiv("image-restoration-option");
		enumOtions = ButtonOptions.imageRestoration;
	});
	morphological_erosion_btn?.addEventListener("click", () => {
		showDiv("morphological-erosion-option");
		enumOtions = ButtonOptions.morphologicalErosion;
	});
	morphological_dilation_btn?.addEventListener("click", () => {
		showDiv("morphological-dilation-option");
		enumOtions = ButtonOptions.morphologicalDilation;
	});
	denoising_gausian_btn?.addEventListener("click", () => {
		showDiv("denoising-gausian-option");
		enumOtions = ButtonOptions.denoisingGausian;
	});
	denoising_nlm_btn?.addEventListener("click", () => {
		showDiv("denoising-nlm-option");
		enumOtions = ButtonOptions.denoisingNlm;
	});
	segmentation_btn?.addEventListener("click", () => {
		showDiv("segmentation-option");
		enumOtions = ButtonOptions.segmentation;
	});

	captureImg?.addEventListener("click", () => {});

	inputFile?.addEventListener("change", () => {
		uploadImage();
	});

	dropArea?.addEventListener("dragover", (event) => {
		event.preventDefault();
	});
	dropArea?.addEventListener("drop", (event) => {
		event.preventDefault();
		console.log("hola esquizo");
		if (inputFile) {
			console.log("hola esquizo");
			const files = event.dataTransfer?.files ?? null;
			inputFile.files = files;
			uploadImage();
		}
	});

	imgProcessBtn?.addEventListener("click", () => {
		switch (enumOtions) {
			case ButtonOptions.imageEnhance:
				imageEnhanceProcess();
				break;
			case ButtonOptions.imageRestoration:
				imageRestorationProcess();
				break;
			case ButtonOptions.morphologicalErosion:
				morphologicalErosionProcess();
				break;
			case ButtonOptions.morphologicalDilation:
				morphologicalDilationProcess().then();
				break;
			case ButtonOptions.denoisingGausian:
				denoisingGausianProcess();
				break;
			case ButtonOptions.denoisingNlm:
				denoisingNlmProcess();
				break;
			case ButtonOptions.segmentation:
				segmentationProcess();
				break;
		}
	});
	console.log("hola esquizo");
	document.querySelector("#greet-form")?.addEventListener("submit", (e) => {
		e.preventDefault();
		greet();
	});
});
