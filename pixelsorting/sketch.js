/// <reference path="../p5.d/p5.global-mode.d.ts" />
// suing p5.js     https://p5js.org
// using CCapture  https://github.com/spite/ccapture.js/

//Values for the slider, default are set through CSS  "value"
var chaosValue, separation, threshhold, offset;

// image size, square images only
var ratio = 500;

// value of 1 is sorting to the right
var sortingDirection = 1;

// img and p5 graphic
let img, graphic;
let userImg;
let userImage = false;
let canvas;
let reset = true;
var imgBackup;

// responsible for switching directions when sorting diagonal
let direction = false;

// Ui Object
const ui = {
  redraw: true,
  changed: false,
};

//CCapture variables
var capturing = false;
var fps = 60;
var startMillis;
var formatType = 1;

let format = {
  format: "png",
  framerate: fps,
  quality: 100,
  name: "pixelsorting",
  verbose: true,
  workersPath: "./",
};
var capturer = new CCapture(format);



/*Preload the sample image 
  it is loaded 3 times because i sometimes had trouble with p5js loading the image
  it is not the most elegant fix but the most stable
*/
function preload() {
  img = loadImage("assets/preset.jpg");
  userImg = loadImage("assets/preset.jpg");
  imgBackup = loadImage("assets/preset.jpg");
  console.log("--preload--");
  userImage = true;
}
/*Sets the sketch up
 */

function setup() {
  // initialize the ui
  loadUI();

  // set the framerate for CCapture
  frameRate(fps);

  // add Eventlisteners for the sliders
  ui.chaos.addEventListener("input", (e) => {
    ui.change = true;
  });

  ui.separation.addEventListener("input", (e) => {
    ui.change = true;
  });

  ui.offset.addEventListener("input", (e) => {
    ui.change = true;
  });

  ui.threshhold.addEventListener("input", (e) => {
    ui.change = true;
  });

  // add Eventlisteners for rightclicking the sort direction botton
  ui.reverse.addEventListener("contextmenu", function (e) {
    sortingDirection -= 1;
    if (sortingDirection < 1) {
      sortingDirection = 8;
    }
    // set the direcrion in the CSS
    ui.reverse.innerHTML = "→↘↓↙←↖↑↗".charAt(sortingDirection - 1);
    // prevents the rightclick menue to pop up
    e.preventDefault();
  });

  // resize images and create the canvas
  img.resize(ratio, ratio);
  imgBackup.resize(ratio, ratio);
  let p5canvas = createCanvas(ratio, ratio);

  // parent the canvas for CCapture
  canvas = p5canvas;
  p5canvas.parent("canvas");
  canvas.drop(fileDropped);

  // create p5 graphic with the selected image
  if (!userImage) {
    graphic = createGraphics(img.width, img.height);
  } else {
    graphic = createGraphics(userImg.width, userImg.height);
  }
}


/*
  This is where the sorting itself happens
*/
function draw() {

  // relaod the ui, if it has changed
  if (ui.change) {
    ui.change = false;
    loadUI();
    redraw();
  }

  
  // count down the time if we are capturing 
  if (capturing) {
    if (startMillis == null) {
      startMillis = millis();
    }
    // max duration, CCapture sometimes stops beforehand, if the filesize is too big
    var duration = 10000;

    // Calculate the elapsed time
    var elapsed = millis() - startMillis;
    var t = map(elapsed, 0, duration, 0, 1);

    // safe the recoring if it is above the time limit 
    if (t > 1) {
      console.log("finished recording.");
      capturer.stop();
      capturer.save();
      setup();
      capturing = false;
    }
  }

  // loadPixels depending on image
  if (!userImage) {
    img.loadPixels();
  } else {
    userImg.resize(ratio, ratio);
    img.copy(userImg, 0, 0, ratio, ratio, 0, 0, ratio, ratio);
    img = userImg;
    img.loadPixels();
  }

/*
  This is where the sorting happens each pixel is compared to another
  and swapped if they are above a certain threshhold.

  All the slider values change certain actions creating the glitches
*/
  switch (sortingDirection) {
    case 1:
      for (let y = ratio; y > 0; y--) {
        for (let x = ratio; x > -1; x--) {
          // calculate the index for our current pixel
          const pixelLocation = x * width + y;

          // convert it to the correct arrayindex (times 4 by default)
          // seperation is controled by the user
          const pixelIndex = pixelLocation * separation;

          // And the index for one pixel to the right (plus 4 by default)
          // chaos is controled by the user
          const nextPixelIndex = pixelIndex + chaosValue;

          //  make sure the index doesn't go out of bounds of the pixel array
          if (nextPixelIndex < img.width * img.height * 4 - 1) {
            // Find the Y indices for both our current pixel and the next one
            const indexY = int(pixelIndex / (width * 4));
            const nextIndexY = int(nextPixelIndex / (width * 4));

            // Get the color of our current pixel
            const r1 = img.pixels[pixelIndex + 0];
            const g1 = img.pixels[pixelIndex + 1];
            const b1 = img.pixels[pixelIndex + 2];

            // Get the color of our neighbor pixel
            // offset is controled by the user
            const r2 = img.pixels[nextPixelIndex + 0 + offset];
            const g2 = img.pixels[nextPixelIndex + 1 + offset];
            const b2 = img.pixels[nextPixelIndex + 2 + offset];

            // Find their brightnesses
            const bri1 = (r1 + g1 + b1) / 3;
            const bri2 = (r2 + g2 + b2) / 3;

            // Different sorting methods, are worse performance wise

            // Find their luminance
            //const bri1 = (r1* 0.2126 + g1 * 0.7152 + b1 * 0.0722);
            //const bri2 = (r2* 0.2126 + g2 * 0.7152 + b2 * 0.0722);

            // Find their saturation
            //  const bri1 = saturation(color(r1, g1, b1));
            //  const bri2 = saturation(color(r2, g2, b2));

            // Only sort if the brightness is above the threshhold
            if (bri1 > threshhold) {
              if (indexY == nextIndexY) {
                if (bri1 < bri2) {
                  img.pixels[pixelIndex + 0] = r2;
                  img.pixels[pixelIndex + 1] = g2;
                  img.pixels[pixelIndex + 2] = b2;

                  img.pixels[nextPixelIndex + 0 + offset] = r1;
                  img.pixels[nextPixelIndex + 1 + offset] = g1;
                  img.pixels[nextPixelIndex + 2 + offset] = b1;
                }
              }
            }
          }
        }
      }
      break;

    /*
        Every switch case ist responsible for changing the sorting direction.
        I unfortunately haven't found a better solution, sinc the for loops need to be reversed
        The general process is the same, with different directions
      */
    case 2:
      if (direction) {
        for (let y = ratio; y > 0; y--) {
          for (let x = ratio; x > -1; x--) {
            const loc = x * width + y;

            const index = loc * separation;

            const nextIndex = index + chaosValue;

            if (nextIndex < img.width * img.height * 4 - 1) {
              const indexY = int(index / (width * 4));
              const nextIndexY = int(nextIndex / (width * 4));

              const r1 = img.pixels[index + 0];
              const g1 = img.pixels[index + 1];
              const b1 = img.pixels[index + 2];

              const r2 = img.pixels[nextIndex + 0 + offset];
              const g2 = img.pixels[nextIndex + 1 + offset];
              const b2 = img.pixels[nextIndex + 2 + offset];

              const bri1 = (r1 + g1 + b1) / 3;
              const bri2 = (r2 + g2 + b2) / 3;

              if (bri1 > threshhold) {
                if (indexY == nextIndexY) {
                  if (bri1 < bri2) {
                    img.pixels[index + 0] = r2;
                    img.pixels[index + 1] = g2;
                    img.pixels[index + 2] = b2;

                    img.pixels[nextIndex + 0 + offset] = r1;
                    img.pixels[nextIndex + 1 + offset] = g1;
                    img.pixels[nextIndex + 2 + offset] = b1;
                  }
                }
              }
            }
          }
        }
      } else {
        for (let y = ratio; y > 0; y--) {
          for (let x = ratio; x > -1; x--) {
            const loc = x * width + y;

            const index = loc * separation;

            var nextIndex;
            if (chaosValue == 4) {
              nextIndex = index + height * 4;
            } else {
              nextIndex = index + height * 4 + chaosValue;
            }

            if (nextIndex < img.width * img.height * 4 - 1) {
              const indexY = int(index / (width * 4));
              const nextIndexY = int(nextIndex / (width * 4));

              const r1 = img.pixels[index + 0];
              const g1 = img.pixels[index + 1];
              const b1 = img.pixels[index + 2];

              const r2 = img.pixels[nextIndex + 0 + offset];
              const g2 = img.pixels[nextIndex + 1 + offset];
              const b2 = img.pixels[nextIndex + 2 + offset];

              const bri1 = (r1 + g1 + b1) / 3;
              const bri2 = (r2 + g2 + b2) / 3;

              if (bri1 > threshhold) {
                if (bri1 < bri2) {
                  img.pixels[index + 0] = r2;
                  img.pixels[index + 1] = g2;
                  img.pixels[index + 2] = b2;

                  img.pixels[nextIndex + 0 + offset] = r1;
                  img.pixels[nextIndex + 1 + offset] = g1;
                  img.pixels[nextIndex + 2 + offset] = b1;
                }
              }
            }
          }
        }
      }
      direction = !direction;
      break;
    case 3:
      for (let y = ratio; y > 0; y--) {
        for (let x = ratio; x > -1; x--) {
          const loc = x * width + y;

          const index = loc * separation;

          var nextIndex;
          if (chaosValue == 4) {
            nextIndex = index + height * 4;
          } else {
            nextIndex = index + height * 4 + chaosValue;
          }

          if (nextIndex < img.width * img.height * 4 - 1) {
            const indexY = int(index / (width * 4));
            const nextIndexY = int(nextIndex / (width * 4));

            const r1 = img.pixels[index + 0];
            const g1 = img.pixels[index + 1];
            const b1 = img.pixels[index + 2];

            const r2 = img.pixels[nextIndex + 0 + offset];
            const g2 = img.pixels[nextIndex + 1 + offset];
            const b2 = img.pixels[nextIndex + 2 + offset];

            const bri1 = (r1 + g1 + b1) / 3;
            const bri2 = (r2 + g2 + b2) / 3;

            if (bri1 > threshhold) {
              if (bri1 < bri2) {
                img.pixels[index + 0] = r2;
                img.pixels[index + 1] = g2;
                img.pixels[index + 2] = b2;

                img.pixels[nextIndex + 0 + offset] = r1;
                img.pixels[nextIndex + 1 + offset] = g1;
                img.pixels[nextIndex + 2 + offset] = b1;
              }
            }
          }
        }
      }
      break;
    case 4:
      if (direction) {
        for (let y = 0; y < ratio; y++) {
          for (let x = 0; x < ratio; x++) {
            const loc = x * width + y;

            const index = loc * separation;

            const nextIndex = index - chaosValue;

            if (nextIndex < img.width * img.height * 4 - 1) {
              const indexY = int(index / (width * 4));
              const nextIndexY = int(nextIndex / (width * 4));

              const r1 = img.pixels[index + 0];
              const g1 = img.pixels[index + 1];
              const b1 = img.pixels[index + 2];

              const r2 = img.pixels[nextIndex + 0 + offset];
              const g2 = img.pixels[nextIndex + 1 + offset];
              const b2 = img.pixels[nextIndex + 2 + offset];

              const bri1 = (r1 + g1 + b1) / 3;
              const bri2 = (r2 + g2 + b2) / 3;

              if (bri1 > threshhold) {
                if (indexY == nextIndexY) {
                  if (bri1 < bri2) {
                    img.pixels[index + 0] = r2;
                    img.pixels[index + 1] = g2;
                    img.pixels[index + 2] = b2;

                    img.pixels[nextIndex + 0 + offset] = r1;
                    img.pixels[nextIndex + 1 + offset] = g1;
                    img.pixels[nextIndex + 2 + offset] = b1;
                  }
                }
              }
            }
          }
        }
      } else {
        for (let y = ratio; y > 0; y--) {
          for (let x = ratio; x > -1; x--) {
            const loc = x * width + y;

            const index = loc * separation;

            var nextIndex;
            if (chaosValue == 4) {
              nextIndex = index + height * 4;
            } else {
              nextIndex = index + height * 4 + chaosValue;
            }

            if (nextIndex < img.width * img.height * 4 - 1) {
              const indexY = int(index / (width * 4));
              const nextIndexY = int(nextIndex / (width * 4));

              const r1 = img.pixels[index + 0];
              const g1 = img.pixels[index + 1];
              const b1 = img.pixels[index + 2];

              const r2 = img.pixels[nextIndex + 0 + offset];
              const g2 = img.pixels[nextIndex + 1 + offset];
              const b2 = img.pixels[nextIndex + 2 + offset];

              const bri1 = (r1 + g1 + b1) / 3;
              const bri2 = (r2 + g2 + b2) / 3;

              if (bri1 > threshhold) {
                if (bri1 < bri2) {
                  img.pixels[index + 0] = r2;
                  img.pixels[index + 1] = g2;
                  img.pixels[index + 2] = b2;

                  img.pixels[nextIndex + 0 + offset] = r1;
                  img.pixels[nextIndex + 1 + offset] = g1;
                  img.pixels[nextIndex + 2 + offset] = b1;
                }
              }
            }
          }
        }
      }
      direction = !direction;
      break;
    case 5:
      for (let y = 0; y < ratio; y++) {
        for (let x = 0; x < ratio; x++) {
          const loc = x * width + y;

          const index = loc * separation;

          const nextIndex = index + chaosValue;

          if (nextIndex < img.width * img.height * 4 - 1) {
            const indexY = int(index / (width * 4));
            const nextIndexY = int(nextIndex / (width * 4));

            const r1 = img.pixels[index + 0];
            const g1 = img.pixels[index + 1];
            const b1 = img.pixels[index + 2];

            const r2 = img.pixels[nextIndex + 0 + offset];
            const g2 = img.pixels[nextIndex + 1 + offset];
            const b2 = img.pixels[nextIndex + 2 + offset];

            const bri1 = (r1 + g1 + b1) / 3;
            const bri2 = (r2 + g2 + b2) / 3;

            if (bri1 > threshhold) {
              if (indexY == nextIndexY) {
                if (bri1 < bri2) {
                  img.pixels[index + 0] = r2;
                  img.pixels[index + 1] = g2;
                  img.pixels[index + 2] = b2;

                  img.pixels[nextIndex + 0 + offset] = r1;
                  img.pixels[nextIndex + 1 + offset] = g1;
                  img.pixels[nextIndex + 2 + offset] = b1;
                }
              }
            }
          }
        }
      }
      break;
    case 6:
      if (direction) {
        for (let y = 0; y < ratio; y++) {
          for (let x = 0; x < ratio; x++) {
            const loc = x * width + y;

            const index = loc * separation;

            const nextIndex = index + chaosValue;

            if (nextIndex < img.width * img.height * 4 - 1) {
              const indexY = int(index / (width * 4));
              const nextIndexY = int(nextIndex / (width * 4));

              const r1 = img.pixels[index + 0];
              const g1 = img.pixels[index + 1];
              const b1 = img.pixels[index + 2];

              const r2 = img.pixels[nextIndex + 0 + offset];
              const g2 = img.pixels[nextIndex + 1 + offset];
              const b2 = img.pixels[nextIndex + 2 + offset];

              const bri1 = (r1 + g1 + b1) / 3;
              const bri2 = (r2 + g2 + b2) / 3;

              if (bri1 > threshhold) {
                if (indexY == nextIndexY) {
                  if (bri1 < bri2) {
                    img.pixels[index + 0] = r2;
                    img.pixels[index + 1] = g2;
                    img.pixels[index + 2] = b2;

                    img.pixels[nextIndex + 0 + offset] = r1;
                    img.pixels[nextIndex + 1 + offset] = g1;
                    img.pixels[nextIndex + 2 + offset] = b1;
                  }
                }
              }
            }
          }
        }
      } else {
        for (let y = 0; y < ratio; y++) {
          for (let x = 0; x < ratio; x++) {
            const loc = x * width + y;

            const index = loc * separation;

            var nextIndex;
            if (chaosValue == 4) {
              nextIndex = index + height * 4;
            } else {
              nextIndex = index + height * 4 + chaosValue;
            }

            if (nextIndex < img.width * img.height * 4 - 1) {
              const indexY = int(index / (width * 4));
              const nextIndexY = int(nextIndex / (width * 4));

              const r1 = img.pixels[index + 0];
              const g1 = img.pixels[index + 1];
              const b1 = img.pixels[index + 2];

              const r2 = img.pixels[nextIndex + 0 + offset];
              const g2 = img.pixels[nextIndex + 1 + offset];
              const b2 = img.pixels[nextIndex + 2 + offset];

              const bri1 = (r1 + g1 + b1) / 3;
              const bri2 = (r2 + g2 + b2) / 3;

              if (bri1 > threshhold) {
                if (bri1 < bri2) {
                  img.pixels[index + 0] = r2;
                  img.pixels[index + 1] = g2;
                  img.pixels[index + 2] = b2;

                  img.pixels[nextIndex + 0 + offset] = r1;
                  img.pixels[nextIndex + 1 + offset] = g1;
                  img.pixels[nextIndex + 2 + offset] = b1;
                }
              }
            }
          }
        }
      }
      direction = !direction;
      break;
    case 7:
      for (let y = 0; y < ratio; y++) {
        for (let x = 0; x < ratio; x++) {
          const loc = x * width + y;

          const index = loc * separation;
          var nextIndex;
          if (chaosValue == 4) {
            nextIndex = index + height * 4;
          } else {
            nextIndex = index + height * 4 + chaosValue;
          }

          if (nextIndex < img.width * img.height * 4 - 1) {
            const indexY = int(index / (width * 4));
            const nextIndexY = int(nextIndex / (width * 4));

            const r1 = img.pixels[index + 0];
            const g1 = img.pixels[index + 1];
            const b1 = img.pixels[index + 2];

            const r2 = img.pixels[nextIndex + 0 + offset];
            const g2 = img.pixels[nextIndex + 1 + offset];
            const b2 = img.pixels[nextIndex + 2 + offset];

            const bri1 = (r1 + g1 + b1) / 3;
            const bri2 = (r2 + g2 + b2) / 3;

            if (bri1 > threshhold) {
              if (bri1 < bri2) {
                img.pixels[index + 0] = r2;
                img.pixels[index + 1] = g2;
                img.pixels[index + 2] = b2;

                img.pixels[nextIndex + 0 + offset] = r1;
                img.pixels[nextIndex + 1 + offset] = g1;
                img.pixels[nextIndex + 2 + offset] = b1;
              }
            }
          }
        }
      }

      break;
    case 8:
      if (direction) {
        for (let y = ratio; y > 0; y--) {
          for (let x = ratio; x > -1; x--) {
            const loc = x * width + y;

            const index = loc * separation;

            const nextIndex = index + chaosValue;

            if (nextIndex < img.width * img.height * 4 - 1) {
              const indexY = int(index / (width * 4));
              const nextIndexY = int(nextIndex / (width * 4));

              const r1 = img.pixels[index + 0];
              const g1 = img.pixels[index + 1];
              const b1 = img.pixels[index + 2];

              const r2 = img.pixels[nextIndex + 0 + offset];
              const g2 = img.pixels[nextIndex + 1 + offset];
              const b2 = img.pixels[nextIndex + 2 + offset];

              const bri1 = (r1 + g1 + b1) / 3;
              const bri2 = (r2 + g2 + b2) / 3;

              if (bri1 > threshhold) {
                if (indexY == nextIndexY) {
                  if (bri1 < bri2) {
                    img.pixels[index + 0] = r2;
                    img.pixels[index + 1] = g2;
                    img.pixels[index + 2] = b2;

                    img.pixels[nextIndex + 0 + offset] = r1;
                    img.pixels[nextIndex + 1 + offset] = g1;
                    img.pixels[nextIndex + 2 + offset] = b1;
                  }
                }
              }
            }
          }
        }
      } else {
        for (let y = 0; y < ratio; y++) {
          for (let x = 0; x < ratio; x++) {
            const loc = x * width + y;
            const index = loc * separation;
            const nextIndex = index + height * 4;
            if (nextIndex < img.width * img.height * 4 - 1) {
              const indexY = int(index / (width * 4));
              const nextIndexY = int(nextIndex / (width * 4));

              const r1 = img.pixels[index + 0];
              const g1 = img.pixels[index + 1];
              const b1 = img.pixels[index + 2];

              const r2 = img.pixels[nextIndex + 0 + offset];
              const g2 = img.pixels[nextIndex + 1 + offset];
              const b2 = img.pixels[nextIndex + 2 + offset];

              const bri1 = (r1 + g1 + b1) / 3;
              const bri2 = (r2 + g2 + b2) / 3;
              if (bri1 > threshhold) {
                if (true) {
                  if (bri1 < bri2) {
                    img.pixels[index + 0] = r2;
                    img.pixels[index + 1] = g2;
                    img.pixels[index + 2] = b2;
                    img.pixels[nextIndex + 0 + offset] = r1;
                    img.pixels[nextIndex + 1 + offset] = g1;
                    img.pixels[nextIndex + 2 + offset] = b1;
                  }
                }
              }
            }
          }
        }
      }
      direction = !direction;
      break;
  }

  // Update the pixels after sorting and displaying the image
  img.updatePixels();
  graphic.image(img, 0, 0);
  image(graphic, 0, 0);

  // capturing each frame if the recording is on
  if (capturing) {
    // console.log("capturing frame");
    // Bind CCapture to the Canvas (the name need to be "defaultCanvas0")
    capturer.capture(document.getElementById("defaultCanvas0"));
  }
}

function loadUI() {
  /*
    This function is responsible for updating the ui and linking the css and js file.
  */

  // UI Elements for the sliders
  ui.chaos = document.querySelector("#ui-chaos input");
  ui.separation = document.querySelector("#ui-separation input");
  ui.offset = document.querySelector("#ui-offset input");
  ui.threshhold = document.querySelector("#ui-threshold input");

  // UI Elements for the buttons
  ui.reset = document.querySelector("#ui-reset");
  ui.reverse = document.querySelector("#ui-reverse");
  ui.record = document.querySelector("#ui-record");
  ui.format = document.querySelector("#ui-format");
  ui.uploadBtn = document.querySelector("#file-upload");

  // Output for CSS values
  var chaosOutput = document.querySelector(".chaos-output");
  var separationOutput = document.querySelector(".separation-output");
  var offsetOutput = document.querySelector(".offset-output");
  var threshholdOutput = document.querySelector(".threshhold-output");

  /* Resets the image by loading the backup with get() depending on which image is used
   */
  ui.reset.onclick = function () {
    if (userImage) {
      userImg = imgBackup.get();
    } else {
      img = imgBackup.get();
    }
  };

  /* EventListener for the Upload Button, creates a file reader
     ensuring that the uploaded file is an image is done 
     in the CSS file with  "accept="image/png, image/gif, image/jpeg""
  */

  ui.uploadBtn.addEventListener("change", uploadImage);
  function uploadImage() {
    let reader;
    if (this.files && this.files[0]) {
      console.log("is an image");

      reader = new FileReader();
      reader.onload = (e) => {
        // on file load, load the image resize it and set is as the userImage
        userImg = loadImage(e.target.result);
        imgBackup = loadImage(e.target.result);
        userImg.resize(ratio, ratio);
        userImage = true;
        console.log(img);
        reset = true;
      };
      reader.readAsDataURL(this.files[0]);
    }
  }

  /* Resets the image and starts the recording by starting CCapture
   */
  ui.record.onclick = function () {
    // reset the image depending if the user uploaded one
    if (userImage) {
      userImg = imgBackup.get();
    } else {
      img = imgBackup.get();
    }

    if (!capturing) {
      capturing = true;
      capturer.start();
      // changes the fontcolor of the recording button if its recording
      document.getElementById("ui-record").style.color = "#ff0000";
    } else {
      capturing = false;
      capturer.stop();
      capturer.save();
      document.getElementById("ui-record").style.color = "#000000";
    }
  };

  /* Function respoonsible for the sorting direction    //→↘↓↙←↖↑↗
     contains values 1 - 8 
  */
  ui.reverse.onclick = function () {
    sortingDirection += 1;
    if (sortingDirection > 8) {
      sortingDirection = 1;
    }
    // picks the correct arrow depending on sotingDirection and puts it on the botton
    ui.reverse.innerHTML = "→↘↓↙←↖↑↗".charAt(sortingDirection - 1);
  };

  /* Function respoonsible for the file format, uses CCapture parameters to set the format
   */
  ui.format.onclick = function () {
    formatType += 1;
    if (formatType > 3) {
      formatType = 1;
    }
    const formatNames = ["png", "gif", "webm"];
    ui.format.innerHTML = formatNames[formatType - 1];
    switch (formatNames[formatType - 1]) {
      case "png":
        capturer = new CCapture({
          format: "png",
          framerate: fps,
          quality: 100,
          name: "pixelsorting_png",
          verbose: true,
        });

        break;
      case "gif":
        capturer = new CCapture({
          format: "gif",
          framerate: fps,
          quality: 100,
          name: "pixelsorting_gif",
          verbose: true,
          workersPath: "./",
        });

        break;
      case "webm":
        capturer = new CCapture({
          format: "webm",
          framerate: fps,
          quality: 100,
          name: "pixelsorting_webm",
          verbose: true,
          workersPath: "./",
        });
        break;
    }
  };

  // Convert ui values to numbers and update the css
  chaosValue = Number(ui.chaos.value);
  separation = Number(ui.separation.value);
  offset = Number(ui.offset.value);
  threshhold = Number(ui.threshhold.value);
  chaosOutput.innerHTML = chaosValue;
  separationOutput.innerHTML = separation;
  offsetOutput.innerHTML = offset / 4;
  threshholdOutput.innerHTML = threshhold;
}

// Function to check fo dropped files onto the canvas
function fileDropped(file) {
  if (isImage(getExtension(file.name))) {
    console.log("file is an image");

    // if the file is an image load it, resize and let the system know it is working with a user image
    userImg = loadImage(file.data);
    imgBackup = loadImage(file.data);
    userImg.resize(ratio, ratio);
    userImage = true;
    reset = true;
  } else {
    console.log("file is not an image");
  }
}

// https://stackoverflow.com/questions/7977084/check-file-type-when-form-submit
// check if the dropped file is an image
function isImage(filename) {
  var ext = getExtension(filename);
  switch (ext.toLowerCase()) {
    case "jpg":
    case "jpeg":
    case "png":
      //etc
      return true;
  }
  return false;
}

// splits filename after the '.' to get the file extension
function getExtension(filename) {
  var parts = filename.split(".");
  return parts[parts.length - 1];
}

/* Below is all the code needed to get the arrow keys to behave correctly 
 Multi input is not easy to check for in JS but i needed it, to get the 
 diagonal sorting directions (pressing → + ↓ = ↘)
  */

// Create bools for each arrow
let keys = {
  RIGHT: false,
  LEFT: false,
  UP: false,
  DOWN: false,
};

// If a single arrow key is pressed, check the boolean and set the sorting direction
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") {
    keys.RIGHT = true;
    sortingDirection = 1;
  }
  if (event.key === "ArrowDown") {
    keys.DOWN = true;
    sortingDirection = 3;
  }
  if (event.key === "ArrowLeft") {
    keys.LEFT = true;
    sortingDirection = 5;
  }
  if (event.key === "ArrowUp") {
    keys.UP = true;
    sortingDirection = 7;
  }

  // If multiple keys are true set the sorting to the diagonal directions
  if (keys.RIGHT && keys.DOWN) {
    sortingDirection = 2;
  }
  if (keys.LEFT && keys.DOWN) {
    sortingDirection = 4;
  }
  if (keys.LEFT && keys.UP) {
    sortingDirection = 6;
  }
  if (keys.UP && keys.RIGHT) {
    sortingDirection = 8;
  }

  // update the CSS ui
  ui.reverse.innerHTML = "→↘↓↙←↖↑↗".charAt(sortingDirection - 1);
});

// Set the boolean to false once the keys are released
document.addEventListener("keyup", (event) => {
  if (event.key === "ArrowRight") {
    keys.RIGHT = false;
  }
  if (event.key === "ArrowLeft") {
    keys.LEFT = false;
  }
  if (event.key === "ArrowUp") {
    keys.UP = false;
  }
  if (event.key === "ArrowDown") {
    keys.DOWN = false;
  }
});
