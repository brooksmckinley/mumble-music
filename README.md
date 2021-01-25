# mumble-music

This is a simple music bot for Mumble written because all the others required too much setup work.

## Setup

1. Make sure you have [youtube-dl](https://youtube-dl.org/) and [ffmpeg](https://ffmpeg.org/) installed to a location accessible by your PATH variable.
2. Copy `config.example.json` to `config.json`, open with a text editor, and edit the settings to your liking
3. Run `npm install` and `npm start`
4. Enjoy 8====)!

## Configuration

* `server`: URL of the server to connect to
* `password`: Server password
* `bitrate`: Bitrate of audio to transmit measured in bits per second. Note that if this goes over the server limit, the audio will abruptly cut out frequently. There's also quite a bit of overhead, so try to go at least 42,000 below the server maximum. If this value is set to null, the bitrate will automatically be set based on this overhead estimation.
* `maxlength`: The maximum length of a song in seconds
* `name`: Username to use when connecting
* `channel`: Channel to join after connecting
* `cache`: Length of time to store cached songs for. Set to null to store indefinitely.
* `privkey`: SSL private key to use. Set to null to avoid using a certificate.
* `cert`: SSL cert for the private key in the previous line. Should be null if the private key is also null.

## Generating SSL Certificates

Here's the command to generate a self-signed SSL certificate and private key for use with this bot:

`openssl req -newkey rsa:4096 -nodes -days 32768 -x509 -keyout privkey.pem -out cert.pem`

In this case, the value for "privkey" in the configuration would be "privkey.pem" and the value for "cert" in the configuration would be "cert.pem."
