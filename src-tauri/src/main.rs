// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{decode, encode};
use image::{DynamicImage, GenericImageView, ImageBuffer};
use imageproc::distance_transform::Norm;
use imageproc::morphology::{dilate, erode};
use photon_rs::{channels, conv, effects, PhotonImage};
use rand::Rng;

// #[derive(Serialize, Deserialize)]
#[tauri::command(rename_all = "snake_case")]
fn image_enhance(image_data_base64: String, amt: i16) -> Result<String, String> {
    let bytes = decode(&image_data_base64).map_err(|e| e.to_string())?;
    let mut img = PhotonImage::new_from_byteslice(bytes);

    // Apply enhancements
    channels::alter_red_channel(&mut img, amt);

    // Convert the enhanced image back to bytes
    let raw_pixels = img.get_raw_pixels();
    let enhanced_image = encode(&raw_pixels);
    Ok(enhanced_image)
}

#[tauri::command(rename_all = "snake_case")]
fn restore_image(
    image_data_base64: String,
    brightness: u8,
    contrast: f32,
) -> Result<String, String> {
    let bytes = decode(&image_data_base64).map_err(|e| e.to_string())?;
    let mut img = PhotonImage::new_from_byteslice(bytes);

    // Apply restoration
    effects::inc_brightness(&mut img, brightness);
    effects::adjust_contrast(&mut img, contrast);

    // Convert the restored image back to bytes

    let raw_pixels = img.get_raw_pixels();
    let restored_image = encode(&raw_pixels);
    Ok(restored_image)
}

#[tauri::command(rename_all = "snake_case")]
fn morphological_erosion(image_data_base64: String, k: u8) -> Result<String, String> {
    // Decode the base64 encoded image data
    let image_bytes = decode(image_data_base64).unwrap();
    let img = image::load_from_memory(&image_bytes).unwrap();
    // Convert the image to grayscale
    let grayscale_img = img.grayscale().into_luma8();

    // Perform the erosion operation on the grayscale image
    let eroded_image = erode(&grayscale_img, Norm::L1, k);
    let encoded_image = encode(eroded_image.as_raw());
    Ok(encoded_image)
}
#[tauri::command(rename_all = "snake_case")]
fn morphological_dilation(image_data_base64: String, k: u8) -> Result<String, String> {
    // Decode the base64 encoded image data
    let image_bytes = decode(image_data_base64).unwrap();
    let img = image::load_from_memory(&image_bytes).unwrap();
    // Convert the image to grayscale
    let grayscale_img = img.grayscale().into_luma8();

    // Perform the erosion operation on the grayscale image
    let eroded_image = dilate(&grayscale_img, Norm::L1, k);
    let encoded_image = encode(eroded_image.as_raw());
    Ok(encoded_image)
}

#[tauri::command(rename_all = "snake_case")]
fn denoising_image_gausian_blur(image_data_base64: String, radius: i32) -> Result<String, String> {
    /* let image_bytes = decode(image_data_base64).unwrap(); */
    let mut img = PhotonImage::new_from_base64(&image_data_base64);

    // Denoising the image
    conv::gaussian_blur(&mut img, radius);

    let denoised_image = encode(img.get_raw_pixels());
    Ok(denoised_image)
}
#[tauri::command(rename_all = "snake_case")]
fn denoising_image_nlm(
    image_data_base64: String,
    window_size: i32,
    h: f64,
) -> Result<String, String> {
    let image_bytes = decode(image_data_base64).unwrap();
    let img = image::load_from_memory(&image_bytes).unwrap();
    // non_local_means(& img, h);

    let denoised_image = non_local_means(&img, window_size, h)
        .to_luma8()
        .as_raw()
        .to_owned();
    Ok(encode(denoised_image))
}

fn non_local_means(img: &DynamicImage, window_size: i32, h: f64) -> DynamicImage {
    let mut denoised_img = ImageBuffer::new(img.width(), img.height());

    for y in 0..img.height() {
        for x in 0..img.width() {
            let mut sum_weights = 0.0;
            let mut sum_pixels = [0.0, 0.0, 0.0];

            for j in -window_size as i32..=window_size as i32 {
                for i in -window_size as i32..=window_size as i32 {
                    let nx = x as i32 + i;
                    let ny = y as i32 + j;

                    if nx >= 0 && ny >= 0 && nx < img.width() as i32 && ny < img.height() as i32 {
                        let neighbor_pixel = img.get_pixel(nx as u32, ny as u32);
                        let current_pixel = img.get_pixel(x, y);

                        let diff = [
                            (current_pixel[0] as i32 - neighbor_pixel[0] as i32).pow(2),
                            (current_pixel[1] as i32 - neighbor_pixel[1] as i32).pow(2),
                            (current_pixel[2] as i32 - neighbor_pixel[2] as i32).pow(2),
                        ];

                        let weight = (-1.0 * (diff[0] + diff[1] + diff[2]) as f64 / h).exp();

                        sum_weights += weight;
                        sum_pixels[0] += weight * neighbor_pixel[0] as f64;
                        sum_pixels[1] += weight * neighbor_pixel[1] as f64;
                        sum_pixels[2] += weight * neighbor_pixel[2] as f64;
                    }
                }
            }

            let denoised_pixel = [
                (sum_pixels[0] / sum_weights) as u8,
                (sum_pixels[1] / sum_weights) as u8,
                (sum_pixels[2] / sum_weights) as u8,
            ];

            denoised_img.put_pixel(x, y, image::Rgb(denoised_pixel));
        }
    }

    DynamicImage::ImageRgb8(denoised_img).to_owned()
}

fn kmeans(data: &Vec<(f64, f64, f64)>, k: usize) -> (Vec<(f64, f64, f64)>, Vec<usize>) {
    // Initialize cluster centroids randomly
    let mut rgn = rand::thread_rng();
    let mut centroids: Vec<(f64, f64, f64)> = Vec::new();
    for _ in 0..k {
        let index = rgn.gen_range(0..data.len());
        centroids.push(data[index]);
    }

    // Initialize cluster assignments
    let mut assignments: Vec<usize> = vec![0; data.len()];

    loop {
        // Assign data points to the nearest centroid
        let mut updated_assignments = false;
        for (i, point) in data.iter().enumerate() {
            let mut min_distance = f64::MAX;
            let mut min_index = 0;
            for (j, centroid) in centroids.iter().enumerate() {
                let distance = euclidean_distance(point, centroid);
                if distance < min_distance {
                    min_distance = distance;
                    min_index = j;
                }
            }
            if assignments[i] != min_index {
                assignments[i] = min_index;
                updated_assignments = true;
            }
        }

        if !updated_assignments {
            break;
        }

        // Update centroids
        let mut cluster_sums: Vec<(f64, f64, f64)> = vec![(0.0, 0.0, 0.0); k];
        let mut cluster_counts: Vec<usize> = vec![0; k];
        for (i, point) in data.iter().enumerate() {
            let cluster_index = assignments[i];
            let (sum_x, sum_y, sum_z) = cluster_sums[cluster_index];
            cluster_sums[cluster_index] = (sum_x + point.0, sum_y + point.1, sum_z + point.2);
            cluster_counts[cluster_index] += 1;
        }
        for j in 0..k {
            let count = cluster_counts[j];
            if count > 0 {
                let centroid = (
                    cluster_sums[j].0 / count as f64,
                    cluster_sums[j].1 / count as f64,
                    cluster_sums[j].2 / count as f64,
                );
                centroids[j] = centroid;
            }
        }
    }

    (centroids, assignments)
}

fn euclidean_distance(p1: &(f64, f64, f64), p2: &(f64, f64, f64)) -> f64 {
    let dx = p1.0 - p2.0;
    let dy = p1.1 - p2.1;
    let dz = p1.2 - p2.2;
    (dx * dx + dy * dy + dz * dz).sqrt()
}

fn recolor_image(
    data: &Vec<(f64, f64, f64)>,
    results: &(Vec<(f64, f64, f64)>, Vec<usize>),
    img: &image::RgbImage,
) -> image::RgbImage {
    let (centroids, assignments) = results;
    let mut new_img: image::RgbImage = ImageBuffer::new(img.width(), img.height());
    for (i, (x, y, pixel)) in data.iter().enumerate() {
        let cluster = assignments[i];
        let (r, g, b) = centroids[cluster];
        new_img.put_pixel(
            *x as u32,
            *y as u32,
            image::Rgb([r as u8, g as u8, b as u8]),
        );
    }
    new_img
}

#[tauri::command(rename_all = "snake_case")]
fn segment_image_kmeans(image_data_base64: String, k: usize) -> Result<String, String> {
    let image_bytes = decode(image_data_base64).map_err(|e| e.to_string())?;
    // let img_2 = image::open("input.png").unwrap().into_rgb8();
    let img = image::load_from_memory(&image_bytes).unwrap().into_rgb8();

    let vec_img = img
        .pixels()
        .map(|pixel| {
            (
                pixel[0] as f64 / 255.0,
                pixel[1] as f64 / 255.0,
                pixel[2] as f64 / 255.0,
            )
        })
        .collect::<Vec<_>>();
    let results_img = kmeans(&vec_img, k);
    let new_img = recolor_image(&vec_img, &results_img, &img);

    Ok(encode(new_img.as_raw()))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            image_enhance,
            restore_image,
            morphological_erosion,
            morphological_dilation,
            denoising_image_gausian_blur,
            denoising_image_nlm,
            segment_image_kmeans
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
