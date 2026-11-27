# Bollywood Celebrity CNN Classifier

A TensorFlow/Keras image-classification project with a FastAPI backend and a cinematic Bollywood-inspired dashboard. It classifies uploaded images into three classes:

- Salman Khan (`salman_khan`)
- Shah Rukh Khan (`shah_rukh_khan`)
- Bobby Deol (`bobby_deol`)

## Features
- Download celebrity image datasets using the built-in image search downloader.
- Upload additional training images for each celebrity.
- Train a MobileNetV2 transfer-learning classifier and monitor training metrics.
- Upload or paste an image URL for predictions.
- Inspect convolutional activation maps.

## Run locally
1. Open a terminal in the project folder.
2. Install dependencies: `pip install -r backend/requirements.txt`
3. Start the API: `cd backend` then `python main.py`
4. Open `http://127.0.0.1:8000`.
5. Click **Collect Celebrity Images**, wait for the dataset download to finish, then train the model.

## Dataset note
The classifier must be trained again using images of the three new celebrities. Use a varied, correctly labelled set (ideally 30–100+ images per class) for more reliable results. Image search results can be noisy, so inspect the dataset folders and remove incorrect or duplicate images before training. The pre-existing footballer model and datasets are not used.


## If Collect Celebrity Images does not download anything

- Make sure the FastAPI backend is running from `backend` with `python main.py`.
- Keep the terminal open while collecting images; download errors are printed there.
- The downloader searches Wikimedia Commons using its public API. Internet access is required.
- If your network blocks Wikimedia Commons, try another network or add images manually using the upload controls.
- Image counts are shown in the dataset panel. The app no longer reports success when zero images were collected.
