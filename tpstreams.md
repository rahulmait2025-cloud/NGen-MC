This is the TP streams documentaion , where i will do all the copy paste , You need to develop it in a good way for the referece points 

# organisation 
Organization
Get all the organizations that belong to the user
you need to send an HTTP GET request to the API Endpoint, with the authentication Header, to list all the organizations belonging to the user.

https://app.tpstreams.com/api/v1/organizations/

cURL
Ruby
Python
C#
curl --request GET \
  --url https://app.tpstreams.com/api/v1/organizations/ \
  --header 'authorization: token 378ad87dc80534b75dcb674da1e7a0145b27461c936c4091c17546fdca6baac1' \
  --header 'cache-control: no-cache'


Response

{
    "count": 2,
    "next": null,
    "previous": null,
    "results": [
        {
            "name": "Testpress",
            "uuid": "6dnpyx",
            "drm_aes_signing_iv": "52B545d56c6G8da12dee470fb656413c",
            "drm_aes_signing_key": "4569d18e02b9e8ebf5ef145693454e729e0b95e6bb8a345db88cfe15d7904785"
        },
        {
            "name": "Streams",
            "uuid": "7coqzy",
            "drm_aes_signing_iv": "90a541d5cc608da12dee470fb654413c",
            "drm_aes_signing_key": "1239d18e02b9e8ebf5ef131a9f564e729e0b95e6bb8a78ddb88cfe15d7904723"
        }
    ]
}







# assets 
Assets
An asset refers to a media content/video that is processed, stored, and delivered through Streams. This endpoint creates an asset allowing users to ingest media content into the TP Streams system for processing and delivery.
Upload an video
To Upload a asset you need to send an HTTP POST request to the API Endpoint, with the authentication Header.

https://app.tpstreams.com/api/v1/<organization_id>/assets/videos/

Fields

Name	Type	Description	Required
content_protection_type	string	To ensure the security of your video content, you can choose from available protection types: 'drm', 'aes' encryption, or indicate 'disable' for no specific protection. Each option offers varying levels of security for your content.	No
title	string	Specify a text string or identifier which can be used for filtering or searching the asset.	No
resolutions	array	Required resolutions of the transformed asset in case of HLS or MPEG-DASH delivery format. Can be a comma separated string out of the following values: 240p, 360p, 480p, 540p, 720p, and 1080p. Re-sized rendition will retain the input aspect ratio.	Yes
inputs	json	URL or web address of a file that TP streams should download to create a new asset.	Yes
folder	string	The UUID of the folder, if you want to upload the video into that specific folder	No
generate_subtitle	boolean	Enable automatic generation of subtitles for the video after upload. Defaults to false if not specified.	No
Pricing

Auto-generated English subtitles cost $0.071 per minute of video content.

info
Subtitle generation is an asynchronous process that may take several minutes
Only one auto-generated subtitle track per video is allowed
Email notifications are sent upon completion or failure
Sample request body

{
  "title": "Big Buck Bunny Video",
  "inputs": [
    {
      "url": "https://static.testpress.in/BigBuckBunny.mp4"
    }
  ],
  "resolutions": ["240p", "360p", "480p", "720p"],
  "content_protection_type": "drm",
  "folder": "32seYYHeNxE",
  "generate_subtitle": true
}


For valid requests the API server returns a JSON:

{
    "id": "9328558d-e0a5-4093-b3b9-8f15ad1550d8", // asset id
    "title": "Big Buck Bunny Video",
    "bytes": null,
    "type": "video",
    "video": {
        "progress": 0,
        "thumbnails": [],
        "status": "Completed",
        "playback_url": "https://d7pdowhru2wq4.cloudfront.net/transcoded/9328558d-e0a5-4093-b3b9-8f15ad1550d8/video.m3u8",
        "dash_url": "https://d7pdowhru2wq4.cloudfront.net/transcoded/9328558d-e0a5-4093-b3b9-8f15ad1550d8/video.mpd",
        "preview_thumbnail_url": null,
        "format": "abr",
        "resolutions": ["240p", "360p", "480p", "720p"],
        "video_codec": "h264",
        "audio_codec": "aac",
        "content_protection_type": "drm",
        "tracks": [],
        "inputs": [
            {
                "url": "https://static.testpress.in/BigBuckBunny.mp4"
            }
        ],
    },
    "parent_id": "32seYYHeNxE",
}



Above response can also be obtained by asset detail API /api/v1/<organization_id>/assets/<asset_id>/

Bulk Upload Videos
Upload multiple videos in a single request by sending an HTTP POST request to the API Endpoint, with the authentication Header.

https://app.tpstreams.com/api/v1/<organization_id>/assets/videos/bulk-create/

Each video object must follow the same structure as described in Upload a Video.

Sample Request Body

An array of video objects, for example:

[
  {
    "title": "Big Buck Bunny Video 1",
    "inputs": [
      { "url": "https://static.testpress.in/BigBuckBunny.mp4" }
    ],
    "resolutions": ["360p", "720p"],
    "content_protection_type": "aes",
    "generate_subtitle": false
  },
  {
    "title": "Big Buck Bunny Video 2",
    "inputs": [
      { "url": "https://static.testpress.in/BigBuckBunny.mp4" }
    ],
    "resolutions": ["480p", "1080p"],
    "content_protection_type": "drm",
    "generate_subtitle": true
  }
]

info
You can upload up to 50 videos in a single request.
Each video must be unique.
If any duplicates are detected or if validation fails for any item:
The API returns a 400 Bad Request error.
No videos are created
Successful requests return all created video assets in the same order as submitted.
Understanding Video Uniqueness

The bulk upload API checks for duplicate videos within your request to prevent accidental re-uploads. A video is considered a duplicate if both the title and the input URL match another video in the same request.

Examples:

Scenario	Video 1	Video 2	Allowed?	Reason
Different videos	Title: "Introduction"
URL: video1.mp4	Title: "Module"
URL: video2.mp4	Yes	Both title and URL are different
Same title, different URL	Title: "Lecture"
URL: video1.mp4	Title: "Lecture"
URL: video2.mp4	Yes	URLs are different (different source files)
Different title, same URL	Title: "Version 1"
URL: video.mp4	Title: "Version 2"
URL: video.mp4	Yes	Titles are different (e.g., different versions)
Exact duplicate	Title: "Tutorial"
URL: video.mp4	Title: "Tutorial"
URL: video.mp4	No	Both title and URL match exactly
Pricing

Auto-generated English subtitles cost $0.071 per minute of video content.

info
Subtitle generation is an asynchronous process that may take several minutes
Only one auto-generated subtitle track per video is allowed
Email notifications are sent upon completion or failure
For valid requests the API server returns a JSON Response:

[
    {
        "title": "Big Buck Bunny Video 1",
        "bytes": null,
        "type": "video",
        "video": {
            "progress": 0,
            "thumbnails": null,
            "status": "Not Started",
            "playback_url": "https://dlbdnoa93s0gw.cloudfront.net/transcoded/ATnJxKqcrHY/video.m3u8",
            "dash_url": "https://dlbdnoa93s0gw.cloudfront.net/transcoded/ATnJxKqcrHY/video.mpd",
            "preview_thumbnail_url": null,
            "cover_thumbnail_url": null,
            "format": "abr",
            "resolutions": [
                "240p",
                "360p",
                "480p",
                "720p"
            ],
            "video_codec": "h264",
            "audio_codec": "aac",
            "enable_drm": true,
            "inputs": [
                {
                    "url": "https://static.testpress.in/BigBuckBunny.mp4"
                }
            ],
            "transmux_only": null,
            "duration": null,
            "content_protection_type": "drm",
            "generate_subtitle": false,
            "video_codecs": [
                "h264"
            ],
            "output_urls": {
                "h264": {
                    "hls_url": "https://dlbdnoa93s0gw.cloudfront.net/transcoded/ATnJxKqcrHY/video.m3u8",
                    "dash_url": "https://dlbdnoa93s0gw.cloudfront.net/transcoded/ATnJxKqcrHY/video.mpd"
                }
            }
        },
        "id": "ATnJxKqcrHY",
        "live_stream": null,
        "parent": {
            "title": "API test",
            "uuid": "78ADBZx9s8r"
        },
        "parent_id": "78ADBZx9s8r"
    },
    {
        "title": "Big Buck Bunny Video 2",
        "bytes": null,
        "type": "video",
        "video": {
            "progress": 0,
            "thumbnails": null,
            "status": "Not Started",
            "playback_url": "https://dlbdnoa93s0gw.cloudfront.net/transcoded/6RbRTBCzjkK/video.m3u8",
            "dash_url": "https://dlbdnoa93s0gw.cloudfront.net/transcoded/6RbRTBCzjkK/video.mpd",
            "preview_thumbnail_url": null,
            "cover_thumbnail_url": null,
            "format": "abr",
            "resolutions": [
                "240p",
                "360p",
                "480p",
                "720p"
            ],
            "video_codec": "h264",
            "audio_codec": "aac",
            "enable_drm": true,
            "inputs": [
                {
                    "url": "https://static.testpress.in/BigBuckBunny.mp4"
                }
            ],
            "transmux_only": null,
            "duration": null,
            "content_protection_type": "drm",
            "generate_subtitle": false,
            "video_codecs": [
                "h264"
            ],
            "output_urls": {
                "h264": {
                    "hls_url": "https://dlbdnoa93s0gw.cloudfront.net/transcoded/6RbRTBCzjkK/video.m3u8",
                    "dash_url": "https://dlbdnoa93s0gw.cloudfront.net/transcoded/6RbRTBCzjkK/video.mpd"
                }
            }
        },
        "id": "6RbRTBCzjkK",
        "live_stream": null,
        "parent": {
            "title": "API test",
            "uuid": "78ADBZx9s8r"
        },
        "parent_id": "78ADBZx9s8r"
    }
]


Video processing time varies based on video duration, file size, and selected resolutions
Use the Get Individual Asset Details endpoint to monitor each video:
GET https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/

Troubleshooting

1. Invalid Request Body Format
{
    "detail": "Request body must be a list of objects."
}

Cause: Request body is not an array.

Fix: Ensure your request body is a JSON array of video objects.

2. Exceeds Upload Limit
{
    "detail": "The maximum number of assets you can upload in a single request is 50. You submitted 75."
}


Cause: Request contains more than 50 videos.

Fix: Split your videos into multiple requests, each containing 50 or fewer videos.

3. Duplicate Videos in Request
{
    "detail": "Duplicate video asset found in the request body.",
    "duplicate_key": "('Big Buck Bunny Video', 'https://static.testpress.in/BigBuckBunny.mp4')",
    "first_occurrence_index": 0,
    "current_occurrence_index": 3,
    "message": "Item at index 3 is a duplicate of the item at index 0. Bulk requests must contain only unique video assets.",
    "item_index": 3
}


Cause: Multiple videos in the request have the same title and input URL combination.

Fix: Ensure each video has a unique combination of title and inputs[0].url. Either change the title or use a different source URL.

4. Validation Error in Video Object
{
    "resolutions": [
        "This field is required."
    ],
    "inputs": [
        "This field is required."
    ],
    "item_index": 2
}

Cause: One or more videos are missing required fields or contain invalid values.

Fix: Check the video at the specified item_index (zero-based) and ensure all required fields are present and valid. Refer to Upload a Video for field requirements.

5. Malformed Input Data
{
    "error_type": "IndexError",
    "item_index": 1
}

Cause: The video object at the specified index has malformed or missing inputs array.

Fix: Ensure each video object has an inputs array with at least one object containing a url field:

{
    "inputs": [
        { "url": "https://example.com/video.mp4" }
    ]
}

Best Practices

Optimize request batch sizes
While 50 videos is the maximum, smaller batches (10-20 videos) are more manageable
Get all the assets that belong to the organization
To get all assets in the organization, you need to send an HTTP GET request to the API Endpoint, with the authentication Header.

Endpoint

https://app.tpstreams.com/api/v1/<organization_id>/assets/

Response

{
    "count": 2,
    "next": "https://app.tpstreams.com/api/v1/dcek2m/assets/?limit=50&offset=50",
    "previous": null,
    "results": [
        {
            "title": "Big Buck Bunny Video",
            "bytes": 450881324,
            "type": "video",
            "video": {
                "progress": 0,
                "thumbnails": [
                    "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/thumbnails/thumbnail_4.png",
                    "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/thumbnails/thumbnail_6.png",
                    "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/thumbnails/thumbnail_5.png",
                    "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/thumbnails/thumbnail_2.png",
                    "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/thumbnails/thumbnail_1.png",
                    "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/thumbnails/thumbnail_3.png"
                ],
                "status": "Completed",
                "playback_url": "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/video.m3u8",
                "dash_url": "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/video.mpd",
                "preview_thumbnail_url": null,
                "cover_thumbnail_url": "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/thumbnails/thumbnail_4.png",
                "format": "abr",
                "resolutions": [
                    "240p",
                    "360p",
                    "480p",
                    "720p"
                ],
                "video_codec": "h264",
                "audio_codec": "aac",
                "enable_drm": true,
                "tracks": [
                            {
                            "id": 4094,
                            "type": "Preview Thumbnail",
                            "preview_thumbnail": {
                                "url": "https://d28qihy7z761lk.cloudfront.net/transcoded/996NXydJQDU/sprite/sprite_image.png",
                                "interval": 2,
                                "width": 160,
                                "height": 90,
                                "rows": 10,
                                "columns": 10
                            }
                             }
                        ],
                "inputs": [
                    {
                        "url": "private/yXrprYum2TS.mp4"
                    }
                ],
                "transmux_only": null,
                "duration": 597,
                "content_protection_type": "drm"
            },
            "id": "yXrprYum2TS",
            "live_stream": null,
            "parent": null,
            "parent_id": null,
        },
        {
            "title": "Data science Live class",
            "bytes": null,
            "type": "livestream",
            "video": null,
            "id": "AAbxGpp8DUm",
            "live_stream": {
                "rtmp_url": "rtmp://13.235.45.255/live",
                "stream_key": "org-dcek2m-live-AAbxGpp8DUm-H4xB",
                "status": "Not Started",
                "hls_url": "https://d28qihy7z761lk.cloudfront.net/live/dcek2m/AAbxGpp8DUm/video.m3u8",
                "start": "2023-12-06 16:37:56",
                "transcode_recorded_video": true,
                "enable_drm_for_recording": true,
                "chat_embed_url": "https://app.tpstreams.com/live-chat/dcek2m/AAbxGpp8DUm/",
                "resolutions": [
                    "240p",
                    "480p",
                    "720p"
                ],
                "enable_drm": true
            },
            "parent": null,
            "parent_id": null,
        }
    ]
}



Get Individual Asset Details
To get a individual asset in the organization, you need to send an HTTP GET request to the API Endpoint, with the authentication Header.

Endpoint

https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/

Fields

Name	Type	Description	Required
expiry	string	The duration (in seconds) for the playback URL to remain valid. For non-encrypted videos, the URL is valid for a lifetime by default. For AES-encrypted videos, defaults to 120 seconds if not specified.	No
Sample request body

{
    "expiry": 300
}

Response

{
    "title": "Big Buck Bunny Video",
    "bytes": 450881324,
    "type": "video",
    "video": {
        "progress": 0,
        "thumbnails": [
            "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/thumbnails/thumbnail_4.png",
            "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/thumbnails/thumbnail_6.png",
            "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/thumbnails/thumbnail_5.png",
            "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/thumbnails/thumbnail_2.png",
            "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/thumbnails/thumbnail_1.png",
            "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/thumbnails/thumbnail_3.png"
        ],
        "status": "Completed",
        "playback_url": "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/video.m3u8Expires=1736006095&Signature=jDr8etkNBN0NWajFNNpiqwQxSyDzW497cz~tAodGK~49deNHWya4pvCy2sRyteyJPU455uDkE3we8MvXOkVenx4m8SR6IB-BsdIFJ0ZraQnMOQqVdsTBn8wBHgXERL28AF71Vkn5yH0-eDWUttzP2jc4o42WO~6SMd1YKjmKdqgyxU9K1TZBXr3tAXPdEJQlzipoRp6j7W~3QgAOz-zcOBRACoXj9P0Xi4yOjMaKSTrvGx~BvF4SBMAbQPGV2i-P-21-tpVCrPl921FRWlbLArt~IMbrfqAZJUXOWGB3NTpSUAMvM8HnQs7JCrySVwQaWGsLhgZk7x-6Ls2olKNb3Q__&Key-Pair-Id=K2XWKDWM065EGO",
        "dash_url": "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/video.mpd",
        "preview_thumbnail_url": null,
        "cover_thumbnail_url": "https://d28qihy7z761lk.cloudfront.net/transcoded/yXrprYum2TS/thumbnails/thumbnail_4.png",
        "format": "abr",
        "resolutions": [
            "240p",
            "360p",
            "480p",
            "720p"
        ],
        "video_codec": "h264",
        "audio_codec": "aac",
        "enable_drm": true,
        "tracks": [
                {
                "id": 4094,
                "type": "Preview Thumbnail",
                "preview_thumbnail": {
                    "url": "https://d28qihy7z761lk.cloudfront.net/transcoded/996NXydJQDU/sprite/sprite_image.png",
                    "interval": 2,
                    "width": 160,
                    "height": 90,
                    "rows": 10,
                    "columns": 10
                }
                    }
            ],
        "inputs": [
            {
                "url": "private/yXrprYum2TS.mp4"
            }
        ],
        "transmux_only": null,
        "duration": 597,
        "content_protection_type": "drm"
    },
    "id": "yXrprYum2TS",
    "live_stream": null,
    "parent": null,
    "parent_id": null,
    "views_count": 404,
    "average_watched_time": 443,
    "total_watch_time": 179192,
    "unique_viewers_count": 312,
    "download_url": "https://d28qihy7z761lk.cloudfront.net/private/yXrprYum2TS.mp4?response-content-disposition=attachment%3B+filename%3DBig+Buck+Bunny+Video.mp4&Expires=1708718514&Signature=wzuk7MhZsjKE9MwG0yaM1cMMFurc3ZIhCmrR0~fx2vgSwVd1d0B68GG~KwE6upj8XJMn~5zrBcadlf8TWeFuRyoRbIw6vipEDbWYLdPQhLwZcHp7mwz7ERNpikvBZJUO7KB5Z~h6BSGvcDBnVVc9pNZ8W2Zz95Ix28dnNhr~J9fqEgHtd0KaOqmX~LVjbHq56u6NiYrm4SZm3hmnWsfuaShWVJzkEBGrgnx8EnYtYe4JkHEBSvnskJvQPuCz82gwlK4vxNSdJ~0g08xkcwkJQG1mLqi39gbumkalS-8jp-pAKoyHMpXsHO6m9FKpwHHjnHp2wwPlSOykUPk1dcrt8Q__&Key-Pair-Id=K2XWKDWM065EGO"
}



Delete Individual Asset
To delete a individual asset in the organization, you need to send an HTTP DELETE request to the API Endpoint, with the authentication Header.

Endpoint

https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/

If the specified asset is a folder, it will remove all its child assets. you need to send an HTTP DELETE request to the API Endpoint, with the authentication Header.

This will delete the specified asset from your organization

Move Individual Asset
To move an asset from one folder to another or to the root directory, you need to send an HTTP POST request to the API Endpoint, with the authentication Header .

Endpoint

https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/move/

Fields

Name	Type	Description	Required
parent	string	UUID of the destination folder	No
Sample request body

{
    "parent": "7hCCRZtXNmq"
}


Response

For valid requests the API server returns a JSON:

{
    "detail": "Asset moved successfully."
}

info
To move an asset to the root directory , send an HTTP POST request with an empty request body to the designated API endpoint.

Generate Subtitle for an Asset
To generate subtitles for a video asset, you need to send an HTTP POST request to the API Endpoint, with the authentication Header.

Endpoint

https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/generate_subtitle/


Description

This endpoint triggers automatic subtitle generation for a video asset using speech-to-text technology. The system will generate English subtitles automatically and save them as a WebVTT (.vtt) file.

Request Body

No request body is required for this endpoint.

Response

For valid requests the API server returns the complete asset data in JSON format with status code 201:

{
    "title": "Big Buck Bunny Video",
    "bytes": 26990804,
    "type": "video",
    "video": {
        "progress": 0,
        "thumbnails": [
        ],
        "status": "Completed",
        "playback_url": "https://d28qihy7z761lk.cloudfront.net/transcoded/7cFHfFSfjna/video.m3u8",
        "dash_url": "https://d28qihy7z761lk.cloudfront.net/transcoded/7cFHfFSfjna/video.mpd",
        "preview_thumbnail_url": "https://d28qihy7z761lk.cloudfront.net/transcoded/7cFHfFSfjna/thumbnails/thumbnail_4.png",
        "cover_thumbnail_url": "https://d28qihy7z761lk.cloudfront.net/transcoded/7cFHfFSfjna/thumbnails/thumbnail_4.png",
        "format": "abr",
        "resolutions": [
            "240p",
            "360p",
            "480p",
            "720p"
        ],
        "video_codec": "h264",
        "audio_codec": "aac",
        "enable_drm": true,
        "tracks": [],
        "inputs": [
            {
                "url": "private/677155207a6847b5b5a8d70cfaf4a8a1.mp4"
            }
        ],
        "transmux_only": null,
        "duration": 19,
        "content_protection_type": "drm",
    },
    "id": "7cFHfFSfjna",
    "live_stream": null,
    "parent_id": "BmN3MXSq5z6"
}


Pricing

Auto-generated English subtitles cost $0.071 per minute of video content.

info
Subtitle generation is an asynchronous process that may take several minutes
Only one auto-generated subtitle track per video is allowed
Email notifications are sent upon completion or failure
Upload Subtitles to an Asset
To upload subtitles to an asset , you need to send an HTTP POST request to the API Endpoint, with the authentication Header .

Endpoint

https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/upload_subtitle/


Fields

Name	Type	Description	Required
subtitle	.vtt file	File Containing Subtitles	Yes
name	string	Name of the subtitles	No
language	string	Language code of the subtitles	No
Send the subtitle file using form-data in the request body.

To know language code please check Language-codes

Sample Postman request body (Form-data only)

OBS settings

Response

For valid requests the API server returns a JSON:

{
    "detail": "Subtitle uploaded successfully"
}

info
For subtitle upload, use form-data in the request body. Select your .vtt file with the "subtitle" key .

Upload Thumbnail to an Asset
To upload Thumbnail to an asset , you need to send an HTTP POST request to the API Endpoint, with the authentication Header .

Endpoint

https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/upload_thumbnail/


Fields

Name	Type	Description	Required
thumbnail	.png, .jpeg, .jpg image	Thumbnail image	Yes
Send the thumbnail Image using form-data in the request body.

Sample Postman request body (Form-data only)

OBS settings

Response

For valid requests the API server returns a JSON:

{
    "detail": "Thumbnail uploaded successfully"
}

info
For Thumbnail upload, use form-data in the request body. select an image file in .png, .jpeg, or .jpg format that is less than 2 MB in size .

Trim Video Asset
To trim a video asset, send an HTTP POST request to the API endpoint with either start_time or end_time (or both) in the request body along with the authentication Header.

Endpoint

https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/trim/

Fields

Name	Type	Description	Required
start_time	number	Start time of the trimmed video (in seconds)	No*
end_time	number	End time of the trimmed video (in seconds)	No*
*At least one of start_time or end_time is required.

Sample Request Body

{
    "start_time": 0,
    "end_time": 30
}

Response

For valid requests, the API server returns a JSON:

{
    "message": "Video trim job started successfully",
    "trim_job_id": 58,
    "status": "Pending"
}

Check Trim Job Status
To check the status of an ongoing or completed trim job, send an HTTP GET request to the status endpoint with the authentication Header.

Endpoint

https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/trim/status/


Response

For valid requests, the API server returns a JSON:

{
    "id": 58,
    "start_time": 0,
    "end_time": 30,
    "status": 1,
    "status_display": "Pending",
    "background_task_id": "abe9d132-ca1b-4cb2-a145-b3c19f7cda85",
    "created": "2025-06-12T19:41:48.001170+05:30",
    "modified": "2025-06-12T19:41:48.071262+05:30"
}

Revert Trimmed Video
To revert a previously trimmed video back to its original state, send an HTTP POST request to the API endpoint along with the authentication Header. This will initiate a background task to restore the full-length video.

Endpoint

https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/trim/revert/


Request Body

No request body is required for this endpoint.

Response

For valid requests, the API server returns a JSON:

{
    "message": "Video revert job started successfully",
    "task_id": "b84b229e-19fb-45c2-be36-dc942a809e87"
}









# folders 

Folders
Create a folder
To create a folder, you need to send an HTTP POST request to the API Endpoint, along with the authentication Header.

https://app.tpstreams.com/api/v1/<organization_id>/assets/folders/

Fields

Name	Type	Description	Required
title	string	The name of the folder	Yes
parent	string	The UUID of the parent folder, if you want to create the folder as a child	No
Sample request body

{
  "title": "CAT videos",
  "parent": "32seYYHeNxE"
}


For valid requests the API server returns a JSON:

{
 "title": "CAT videos",
 "uuid": "46seZZHAnWE", // folder id
}


Get all the Folders that belong to the organization
To get all folders in the organization, you need to send an HTTP GET request to the API Endpoint, with the authentication Header.

https://app.tpstreams.com/api/v1/<organization_id>/assets/folders/

You can get all folders that match your search query using the q parameter:

GET https://app.tpstreams.com/api/v1/<organization_id>/assets/folders/?q=test

For valid requests the API server returns a JSON:

{
    "count": 3,
    "next": null,
    "previous": null,
    "results": [
        {
            "title": "Testing videos",
            "uuid": "6bBcXxu5cAM"
        },
        {
            "title": "OnBorading test",
            "uuid": "BmN3MXSq5z6"
        },
        {
            "title": "test",
            "uuid": "nD8K9nJ3Bsm"
        },
    ]
}






# DRM Licnce 
DRM License
To play DRM protected videos, your player should request DRM licence from our URL.

This API requires access_token in query param for authentication.

POST: https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/drm_license/?access_token={{access_token}}&drm_type={{drm_type}}


Query Parameters

Name	Type	Description	Default
drm_type	string	The type of DRM. Options: widevine, fairplay.	widevine
Request Body

Name	Type	Description	Required
player_payload	string	For Widevine, this is the key message. For FairPlay, this is the SPC message. This must be encoded in base64.	Yes
rental_duration_seconds	integer	Total validity period (in seconds) of a stored license on the device. Used only for persistent (offline) licenses. Defines how long the license remains usable before it expires.	No
license_duration_seconds	integer	(Widevine only) Duration (in seconds) for which playback is allowed. This defines the active viewing window once playback begins.	No
lease_duration_seconds	integer	(FairPlay only) Duration (in seconds) for which playback is allowed. This defines the active viewing window once playback begins.	No
is_persistent	boolean	Set to true to allow the license to be stored on the device for offline playback.	No
widevine	object	Additional configurations for Widevine. See the Widevine table below.	No
Widevine Configuration Fields

Name

Description

content_key_specs.track_type

A track type definition, Options are

AUDIO - audio tracks
SD - 576p or less
HD - 720p, 1080p
UHD1 - 4K
UHD2 - 8K
content_key_specs.security_level

Security level for content key specs, Default = 1.

1 - Software-based whitebox crypto is required. (SW_SECURE_CRYPTO).
2 - Software crypto and an obfuscated decoder is required. (SW_SECURE_DECODE).
3 - Key material and crypto operations must be performed within a hardware- backed trusted execution environment. (HW_SECURE_CRYPTO).
4 - Crypto and decoding of content must be performed within a hardware- backed trusted execution environment. (HW_SECURE_DECODE).
5 - Crypto, decoding, and all handling of media (compressed and uncompressed) must be handled within a hardware- backed trusted execution environment. (HW_SECURE_ALL)
content_key_specs.required_output_protection.hdcp

Output protection options for HDCP Options:

HDCP_NONE
HDCP_V1
HDCP_V2
HDCP_V2_1
HDCP_V2_2
HDCP_V2_3
HDCP_NO_DIGITAL_OUTPUT
Sample Payloads

Widevine Sample
{
  "player_payload": "<base64_encoded_key_message>",
  "license_duration_seconds": 3600,
  "rental_duration_seconds": 7200,
  "is_persistent": false,
  "widevine": {
    "content_key_specs": [
      {
        "track_type": "SD",
        "security_level": 1,
        "required_output_protection": { "hdcp": "HDCP_V1" }
      },
      {
        "track_type": "HD",
        "security_level": 1,
        "required_output_protection": { "hdcp": "HDCP_V1" }
      },
      {
        "track_type": "UHD1",
        "security_level": 1,
        "required_output_protection": { "hdcp": "HDCP_V1" }
      },
      {
        "track_type": "UHD2",
        "security_level": 1,
        "required_output_protection": { "hdcp": "HDCP_V1" }
      },
      {
        "track_type": "AUDIO",
        "security_level": 1,
        "required_output_protection": { "hdcp": "HDCP_V1" }
      }
    ]
  }
}

FairPlay Sample
{
  "player_payload": "<base64_encoded_spc_data>",
  "lease_duration_seconds": 3600,
  "rental_duration_seconds": 7200,
  "is_persistent": true
}

Response
The API returns the raw binary license which should be passed directly to the browser's CDM or the player SDK.

Status Code: 200 OK
Content-Type: application/octet-stream
Body: Raw binary data (Widevine License or FairPlay Content Key Context).
Security Considerations:

The recommendation is to invoke the DRM license endpoint on the server, rather than on the client. This precaution is taken because passing the License configuration and calling it from the client could expose configurations to users.





# webhooks


Web Hooks
Streams uses webhooks to notify your application about things that happen asynchronously, apart from the API request-response cycle. For example, you may want to update something on your end when a video asset status changes from queued to ready or errored. When these events happen, Streams will make a POST request to the address you give us and you can do whatever you need with it on your end.

Configure Webhook
Webhooks can be configured using a webhook endpoint URL and a secret token to ensure authenticity. Once the webhook is configured for a video source or different video sources, a notification will be sent for each event for the sources. Here, the parameter Secret Token is used to ensure in your code that the Webhook is coming from Streams.

Create a Webhook
To Create a webhook you need to send an HTTP POST request to the API Endpoint, with the Authentication Header.

https://app.tpstreams.com/api/v1/<organization_id>/webhooks/

Fields

Name	Type	Description	Required
url	string	URL to which asset data to be sent.	True
secret_token	string	secret_token will be sent in x-streams-token.	True
Sample request body

{
    "url": "https://sample.beeceptor.com",
    "secret_token": "abcdef",
}


For valid requests the API server returns a JSON:

{
    "url": "https://sample.beeceptor.com",
    "secret_token": "abcdef",
    "id": "c4cf9c5f-0b60-4e5c-9db9-81321ffe31d5"
}

List all webhooks
To get all the webhooks, you need to send an HTTP GET request to the API Endpoint, with the Authentication Header.

Endpoint

https://app.tpstreams.com/api/v1/<organization_id>/webhooks/

Response

{
    "count": 1,
    "next": null,
    "previous": null,
    "results": [
        {
            "url": "https://sample.beeceptor.com",
            "secret_token": "abcdef",
            "id": "c4cf9c5f-0b60-4e5c-9db9-81321ffe31d5"
        }
    ]
}

Update a webhook
To update a webhook, you need to send an HTTP PUT request to the API Endpoint, with the Authentication Header.

Endpoint

https://app.tpstreams.com/api/v1/<organization_id>/webhooks/<webhook_id>/

Response

{
    "url": "https://sample1.beeceptor.com",
    "secret_token": "abcdef",
    "id": "c4cf9c5f-0b60-4e5c-9db9-81321ffe31d5"
}

Delete a webhook
To delete a webhook, you need to send an HTTP DELETE request to the API Endpoint, with the Authentication Header.

Endpoint

https://app.tpstreams.com/api/v1/<organization_id>/webhooks/<webhook_id>/

WebHook Response
Whenever the status of asset changes, response will be sent to the webhook. Sample webhook response is as follows

{
    "id": "9328558d-e0a5-4093-b3b9-8f15ad1550d8", // asset id
    "title": "Big Buck Bunny Video",
    "bytes": null,
    "type": "video",
    "video": {
        "progress": 0,
        "thumbnails": [],
        "status": "Completed",
        "playback_url": "https://d7pdowhru2wq4.cloudfront.net/transcoded/9328558d-e0a5-4093-b3b9-8f15ad1550d8/video.m3u8",
        "dash_url": "https://d7pdowhru2wq4.cloudfront.net/transcoded/9328558d-e0a5-4093-b3b9-8f15ad1550d8/video.mpd",
        "preview_thumbnail_url": null,
        "format": "abr",
        "resolutions": ["240p", "360p", "480p", "720p"],
        "video_codec": "h264",
        "audio_codec": "aac",
        "enable_drm": true,
        "tracks": [],
        "inputs": [
            {
                "url": "https://static.testpress.in/BigBuckBunny.mp4"
            }
        ],
    },
}








# Access token

Access token
An access token is essential for secure video playback .

Create an Access token
To generate the Access token you need to send an HTTP POST request to the API Endpoint, with the authentication Header and the optional Access token request Body.

https://app.tpstreams.com/api/v1/{{org_code}}/assets/{{asset_id}}/access_tokens/


Optional Fields

Name	Type	description
time_to_live	integer	By default, the Access token validity is set to infinity. You can create shorter-lived URLs by passing the time_to_live parameter. This value is to be set in seconds
expires_after_first_usage	boolean	Passing true will make the access token expire immediately after the first usage
annotations	json	JSON contain all the information about the watermark. Please refer to this doc for details on watermarking.
For valid requests the API server returns a JSON:

{
    "playback_url":"https://app.tpstreams.com/embed/dcek2m/6cKHaeJ44pp/?access_token=1a60b175-c2e8-4a38-814b-323697f52994",
    "expires_after_first_usage":false,
    "code":"1a60b175-c2e8-4a38-814b-323697f52994",
    "status":"Active","valid_until":null,
    "annotations":[]
}


View Access token
Make get request to the below API with your video id and access token code to get the access token details

https://app.tpstreams.com/api/v1/{{org_code}}/assets/{{asset_id}}/access_tokens/{access_token_code}/


Response

    {
        "playback_url": "https://app.tpstreams.com/embed/d2ff26b2-f88e-4d6d-a9ce-bb0e3ce858cc/?access_token=e91e2bf4-a3ab-493f-8685-7b88ea943c5a",
        "expires_after_first_usage": false,
        "code": "e91e2bf4-a3ab-493f-8685-7b88ea943c5a",
        "status": "Active",
        "valid_until": null,
        "annotations": [
            {
                "text": "moving text",
                "type": "dynamic",
                "color": "#FF0000",
                "opacity": "0.80",
                "size": 15,
                "interval": 1000,
                "skip": 0,
                "x": 16,
                "y": 16
            }
        ]
    }


Update Access token
https://app.tpstreams.com/api/v1/{{org_code}}/assets/{{asset_id}}/access_tokens/{access_token_code}/


This code below updates the access_token time_to_live.

{
    time_to_live: 300
}

Response

{
    "playback_url": "https://app.tpstreams.com/embed/d2ff26b2-f88e-4d6d-a9ce-bb0e3ce858cc/?access_token=e91e2bf4-a3ab-493f-8685-7b88ea943c5a",
    "expires_after_first_usage": false,
    "code": "e91e2bf4-a3ab-493f-8685-7b88ea943c5a",
    "status": "Active",
    "valid_until": "2022-08-30T14:24:23.835382Z",
    "annotations": []
}


# Usage 

Usages
The Usage API helps you get your organization usage's.

Get Your Organization's Usage
To retrieve your organization's data usage, send an HTTP GET request to the API Endpoint, with the authentication Header.

Endpoint

https://app.tpstreams.com/api/v1/<organization_id>/assets_usage/

Query Parameter

The Usage API provides various options to filter data using query parameters:

Parameter	Description	Type
month	Filter by month	Integer
year	Filter by year	Integer
day	Filter by day	Integer
time_frame	Filter by timeframe	String ("daily" or "monthly")
start	Start date	Date (YYYY-MM-DD)
end	End date	Date (YYYY-MM-DD)
ordering	Order results	"date" (asc) or "-date" (desc)
Response

{
    "count": 3,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": 5385,
            "date": "2023-04-01",
            "bandwidth_used": 245540965,
            "subtitle_generation_cost": 0,
            "live_stream_usage": 0,
            "active_storage_bytes": 1198712474,
            "deleted_storage_bytes": 41007799,
            "total_storage_bytes": 1239720273
        },
        {
            "id": 5253,
            "date": "2023-05-01",
            "bandwidth_used": 2484764822,
            "subtitle_generation_cost": 0,
            "live_stream_usage": 0,
            "active_storage_bytes": 10651243573,
            "deleted_storage_bytes": 1043743829,
            "total_storage_bytes": 11694987402
        },
        {
            "id": 5178,
            "date": "2023-06-01",
            "bandwidth_used": 27907667,
            "subtitle_generation_cost": 0,
            "live_stream_usage": 0,
            "active_storage_bytes": 10891400407,
            "deleted_storage_bytes": 1043973205,
            "total_storage_bytes": 11935373612
        }
    ]
}




# Chapters

Chapters
Manage video chapters to enable navigation within your video content.

Add Video Chapters
To create chapters for an existing video asset, send an HTTP POST request to the API endpoint with the authentication header.

Endpoint
https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/chapters/

Request Fields
Field	Type	Description	Required
chapters	array<ChapterObject>	List of chapter definitions	Yes
ChapterObject Schema
Field	Type	Description	Required
title	string	Title of the chapter	Yes
start_time	string	HH:MM:SS timestamp within the video duration	Yes
Examples
cURL
Python
curl -X POST \
"https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/chapters/" \
-H "Authorization: token <API_TOKEN>" \
-H "Content-Type: application/json" \
-d '{
  "chapters": [
    {"title": "Intro", "start_time": "00:00:02"},
    {"title": "Overview", "start_time": "00:01:30"}
  ]
}'


Sample Response
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {"id": 6427, "title": "Intro", "start_time": "00:00:02"},
    {"id": 6428, "title": "Overview", "start_time": "00:01:30"}
  ]
}

View Video Chapters
To retrieve chapters for a specific video asset, send an HTTP GET request to the API endpoint with the authentication header.

Endpoint
https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/chapters/

Examples
cURL
Python
curl -X GET \
"https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/chapters/" \
-H "Authorization: token <API_TOKEN>"


Sample Response
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {"id": 6427, "title": "Intro", "start_time": "00:00:02"},
    {"id": 6428, "title": "Overview", "start_time": "00:01:30"}
  ]
}

Delete a Video Chapter
To delete a specific chapter from a video asset, send an HTTP DELETE request to the API endpoint with the authentication header.

Endpoint
https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/chapters/<chapter_id>/


Examples
cURL
Python
curl -X DELETE \
"https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/chapters/<chapter_id>/" \
-H "Authorization: token <API_TOKEN>"


Success Response
Status: 204 No Content

Status Codes
Status Code	Description
200 OK	Chapters retrieved successfully
201 Created	Chapters created successfully
204 No Content	Chapter deleted successfully
400 Bad Request	Invalid data or timestamp format
401 Unauthorized	Missing or invalid authentication
404 Not Found	Asset or chapter does not exist
500 Internal Server Error	Unexpected server issue







# live stream 

Create a live stream instantly
To Create a live stream instantly you need to send an HTTP POST request to the API Endpoint, with the authentication Header.

https://app.tpstreams.com/api/v1/<organization_id>/assets/live_streams/

Fields

Name	Type	Description	Required
title	string	Specify a text string or identifier which can be used for filtering or searching the live stream.	Yes
enable_drm_for_recording	boolean	A boolean value to enable or disable DRM for live stream recording.	No
latency	string	Selects the desired latency for the live stream (Options: Low Latency, Normal Latency).	No
Sample request body

{
  "title": "Data science Live class",
  "enable_drm_for_recording": true,
  "latency": "Low Latency"
}


For valid requests the API server returns a JSON:

{
    "title": "Data science Live class",
    "bytes": null,
    "type": "livestream",
    "video": null,
    "id": "5h6EpZQC6sh",
    "live_stream": {
        "rtmp_url": "",
        "stream_key": null,
        "status": "Not Started",
        "hls_url": "https://d28qihy7z761lk.cloudfront.net/live/gcdem4/5h6EpZQC6sh/video.m3u8",
        "start": "2024-04-23 16:56:48",
        "transcode_recorded_video": true,
        "enable_drm_for_recording": true,
        "chat_embed_url": null,
        "resolutions": [
            "240p",
            "480p",
            "720p"
        ],
        "enable_drm": true,
        "enable_llhls": false,
        "latency": "Low Latency"
    },
    "parent": null,
    "parent_id": null
}


info
The live stream server typically takes around 20-30 seconds to start.
Once it's up and running, both the "rtmp_url" and "stream_key" will become accessible.
To automatically receive rtmp_url and stream key as soon as the server is established,WebHook Response.

After successfully registering the webhook, you will receive an rtmp_url and stream_key as a response paste it in the obs stream settings Settings > Stream




# Schedule a Live Stream 
Schedule a live stream
Schedule a live stream
To Schedule a live stream you need to send an HTTP POST request to the API Endpoint, with the authentication Header.

https://app.tpstreams.com/api/v1/<organization_id>/assets/live_streams/

Fields

Name	Type	Description	Required
title	string	Specify a text string or identifier which can be used for filtering or searching the live stream.	Yes
start	string	Specify the date and time (in the format: "YYYY-MM-DD HH:MM:SS") when the live stream should be scheduled.	Yes
enable_drm_for_recording	boolean	A boolean value to enable or disable DRM for live stream recording.	No
Sample request body

{
  "title": "Data science Live class",
  "start": "2024-10-05 15:30:00",
  "enable_drm_for_recording": false
}


For valid requests the API server returns a JSON:

{
    "title": "Data science Live class",
    "bytes": null,
    "type": "livestream",
    "video": null,
    "id": "AuC9yX2EtBr",
    "live_stream": {
        "rtmp_url": "",
        "stream_key": null,
        "status": "Not Started",
        "hls_url": "https://d28qihy7z761lk.cloudfront.net/live/gnarys/AuC9yX2EtBr/video.m3u8",
        "start": "2024-10-05 15:30:00",
        "transcode_recorded_video": true,
        "enable_drm_for_recording": false,
        "chat_embed_url": null,
        "resolutions": [
            "240p",
            "480p",
            "720p"
        ]
    },
    "parent": null,
    "parent_id": null
}


Live stream is created with the scheduled time for you to start the server later.

Above response has the details of the live stream scheduled which can also be obtained by API /api/v1/<organization_id>/assets/<asset_id>/

info
Scheduled live streams will not automatically start at the specified time; they must be manually initiated.
RTMP URL and stream key will be available once you start the stream






# start the schedules Live stream 
Start the scheduled live stream
To Start a server for the scheduled live stream you need to send an HTTP POST request to the API Endpoint, with the authentication Header.

https://app.tpstreams.com/api/v1/<organization_id>/assets/<str:asset_id>/start_server/


For valid requests the API server returns a JSON:

{
    "title": "Data science Live class",
    "bytes": null,
    "type": "livestream",
    "video": null,
    "id": "8XGEEj6ptnB",
    "live_stream": {
        "rtmp_url": "",
        "stream_key": null,
        "status": "Not Started",
        "hls_url": "https://d3cydmgt9q030i.cloudfront.net/live/edee9b/8XGEEj6ptnB/video.m3u8",
        "start": "2024-10-05 15:30:00",
        "transcode_recorded_video": true,
        "enable_drm_for_recording": false,
        "chat_embed_url": "https://app.tpstreams.com/live-chat/edee9b/8XGEEj6ptnB/",
        "resolutions": [
            "240p",
            "480p",
            "720p"
        ]
    },
    "parent": null,
    "parent_id": null
}


This will start the server for specified live stream

Above response has the details of the live stream started which can also be obtained by API /api/v1/<organization_id>/assets/<asset_id>/

info
The live stream server typically takes around 20-30 seconds to start.
Once it's up and running, both the "rtmp_url" and "stream_key" will become accessible.
To automatically receive rtmp_url and stream key as soon as the server is established,Create a Web Hook.

After successfully registering the webhook, you will receive an updated webhook response.





# Live Stream Events & Status

This document explains the workflow and status of your live stream, describing the progression of events from scheduling to final video availability. This guide will help you understand the real-time status updates and webhook events you receive.

Live Stream Statuses
Live stream statuses reflect the overall state of your live stream. These are visible on the asset details page.

Status	Meaning
NOT_STARTED	The live stream has been scheduled, and the server is being provisioned. Your stream is not yet ready to accept a broadcast.
STREAMING	The server is ready and actively receiving a live video feed. This means your broadcast is live and viewable by your audience.
RECORDING	The stream is actively being recorded. The content is being captured and stored for later use, even if the live broadcast itself ends.
DISCONNECTED	The connection between your broadcasting software (OBS) and the streaming server has been lost. This could be due to a network issue, a power failure, or a temporary disconnection. The server remains active for a short period, allowing you to reconnect and resume the stream without creating a new one.
STOPPED	The live stream has been manually ended by the user or has timed out after a disconnection. The server has been terminated, and the live stream is no longer active. To stream again, you must create a new live stream.
COMPLETED	The live stream has finished, and the recorded video is now fully processed and available. This status is typically seen after a stream has ended and the recording has been transcoded and stored.
ERROR	An unexpected error has occurred, preventing the live stream from continuing.
Live Stream Events
Events are the specific, immediate actions (like starting or stopping) that change the stream's Status. These messages appear in your detailed logs and are sent directly to your system via webhooks.

Event Type	Meaning
CREATED	The initial event, triggered when a live stream is created. This event signals that a server instance is being spun up to handle the broadcast. This corresponds to the NOT_STARTED status.
ON_PUBLISH	The event that indicates a successful connection from the broadcasting software (OBS). The stream is now live. This corresponds to the STREAMING status.
ON_PUBLISH_DONE	The event that indicates a temporary disconnection from the broadcasting software. This could be due to a user stopping the stream, a network interruption, or another issue. The server is still running for a short time, giving you a chance to reconnect. This corresponds to the DISCONNECTED status.
STOPPED	The final event, triggered when a live stream is permanently ended. The server has been terminated, and the stream cannot be resumed. This corresponds to the STOPPED status.
RECORDING	An event indicating that the stream is being recorded. This is separate from the ON_PUBLISH event and focuses on the recording process. This corresponds to the RECORDING status.
COMPLETED	An event signaling that the live stream recording has been fully processed, and the final video file is ready. This corresponds to the COMPLETED status.
ERROR	An event indicating that an error has occurred during the live stream. This corresponds to the ERROR status.
Example Live Stream Workflow
Sample API response

{
  "id": "9JGyz9njKnj",
  "title": "Test session",
  "type": "livestream",
  "live_stream": {
     ...
    "activities": [
      {
        "status": "On Publish",
        "timestamp": "September 22, 2025, 05:59 PM"
      },
      {
        "status": "On Publish Done",
        "timestamp": "September 22, 2025, 06:06 PM"
      },
      {
        "status": "Stopped",
        "timestamp": "September 22, 2025, 06:17 PM"
      }
    ]
  }
}

A live stream is scheduled.

Action: The server is initiated, and an RTMP key and ID are generated.
Status: NOT_STARTED
Event: CREATED
The broadcaster starts streaming from their broadcasting software (e.g., OBS).

Action: The live stream is now active and viewable.
Status: STREAMING
Event: ON_PUBLISH
The broadcaster's network temporarily disconnects.

Action: The stream is temporarily paused, but the server is still running, awaiting a reconnection.
Status: DISCONNECTED
Event: ON_PUBLISH_DONE
The broadcaster fails to reconnect, or the stream is manually stopped.

Action: The server is terminated, and the live stream has officially ended.
Status: STOPPED
Event: STOPPED



# List Live Streams API
To retrieve a list of live streams in the organization, send an HTTP GET request to the API Endpoint, with the authentication Header. This API supports to list live streams, scheduled live streams

https://app.tpstreams.com/api/v1/<organization_id>/assets/live_streams/

Sample webhook response is as follows

{
    "count": 2,
    "next": null,
    "previous": null,
    "results": [
        {
            "title": "Data Science Live Class",
            "bytes": null,
            "type": "livestream",
            "video": null,
            "id": "8DH94uXQgrA",
            "live_stream": {
                "rtmp_url": "rtmp://52.66.213.19/live",
                "stream_key": "org-89b2cy-live-8DH94uXQgrA-7XkI",
                "status": "Completed",
                "hls_url": "https://d3cydmgt9q030i.cloudfront.net/live/89b2cy/8DH94uXQgrA/video.m3u8",
                "start": "2023-12-07 13:02:16",
                "transcode_recorded_video": true,
                "enable_drm_for_recording": true,
                "chat_embed_url": null,
                "resolutions": [
                    "240p",
                    "480p",
                    "720p"
                ]
            },
            "parent": null,
            "parent_id": null
        },
        {
            "title": "GO LIVE NOW",
            "bytes": null,
            "type": "livestream",
            "video": null,
            "id": "9QgXR3pPj49",
            "live_stream": {
                "rtmp_url": "",
                "stream_key": null,
                "status": "Completed",
                "hls_url": "https://d3cydmgt9q030i.cloudfront.net/live/89b2cy/9QgXR3pPj49/video.m3u8",
                "start": "2023-12-07 12:34:42",
                "transcode_recorded_video": true,
                "enable_drm_for_recording": true,
                "chat_embed_url": null,
                "resolutions": [
                    "240p",
                    "480p",
                    "720p"
                ]
            },
            "parent": null,
            "parent_id": null
        }
    ]
}






# Stop a live stream 

To Stop a live stream you need to send an HTTP POST request to the API Endpoint, with the authentication Header.

https://app.tpstreams.com/api/v1/<organization_id>/assets/<str:asset_id>/stop_live_stream/


This will stop the specified live stream

For valid requests the API server returns a JSON:

{
    "message": "Live stream stopped successfully",
    "trim_scheduled": false
}

Schedule Trim After Live Stream
You can optionally add trim parameters to the stop API request body to schedule a trim operation that will be executed after the live stream recording is completed and transcoded. This allows you to trim the recorded video directly when stopping the live stream.

Fields for Trim Scheduling

Name	Type	Description	Required
start_time	integer	Start time for trim. Can be either relative seconds from the beginning of the recording or epoch timestamp	Yes (for trim)
end_time	integer	End time for trim. Can be either relative seconds from the beginning of the recording or epoch timestamp	Yes (for trim)
Timestamp Formats

You can specify trim times using either of the following formats:

Relative Seconds: Time in seconds from the beginning of the recording
Epoch Timestamps: Unix timestamps
info
Both start_time and end_time must use the same format (either relative seconds or epoch timestamps).
Mixing formats in a single request is not allowed
Sample request body with relative seconds

{
    "start_time": 30,
    "end_time": 120
}

Sample request body with epoch timestamps

{
    "start_time": 1736754600,
    "end_time": 1736754900
}

info
When scheduling a trim:

Both start_time and end_time are required
Both must be non-negative integers
start_time must be less than end_time
end_time cannot exceed the total duration of the live stream recording
The trim operation will be executed automatically after transcoding completes
Response with trim scheduled

{
    "message": "Live stream stopped successfully",
    "trim_scheduled": true
}

info
If the value of the parameter "transcode_recorded_video" is set to true, you will receive the video object in the webhook response.

Sample webhook response is as follows

{
    "title": "Data science Live class",
    "bytes": null,
    "type": "livestream",
    "video": {
        "progress": 0,
        "thumbnails": [],
        "status": "Completed",
        "playback_url": "https://d7pdowhru2wq4.cloudfront.net/transcoded/9328558d-e0a5-4093-b3b9-8f15ad1550d8/video.m3u8",
        "dash_url": "https://d7pdowhru2wq4.cloudfront.net/transcoded/9328558d-e0a5-4093-b3b9-8f15ad1550d8/video.mpd",
        "preview_thumbnail_url": null,
        "format": "abr",
        "resolutions": ["240p", "360p", "480p", "720p"],
        "video_codec": "h264",
        "audio_codec": "aac",
        "enable_drm_for_recording": true,
        "tracks": [],
        "inputs": [
            {
                "url": "https://static.testpress.in/Data_science_Live_class.mp4"
            }
        ],
    }, 
    "id": "4PtERT9d9uK",
    "live_stream": {
        "rtmp_url": "rtmp://23.427.127.24/live",
        "stream_key": "org-4xu8ay-live-4PtERT9d9uK-jKP4",
        "status": "Completed",
        "hls_url": "https://d28qihy7z761lk.cloudfront.net/live/4xu8ay/4PtERT9d9uK/video.m3u8",
        "start": null,
        "transcode_recorded_video": true,
        "chat_embed_url":"https://app.tpstreams.com/live-chat/4PtERT9d9uK/"
    },
    "parent_id": null
}



# Delete Live Stream API
To delete an individual live stream in the organization, send an HTTP DELETE request to the API Endpoint , with the authentication Header. This API supports the deletion of both live and scheduled live streams.

https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/

For a successful request, status 204 is returned.

info
If the streaming live stream or a live stream with an active server is deleted, it will result in stopping the server.



# WebHook
To notify your application about things that happen asynchronously , Create a Web Hook.

After successfully registering the webhook, whenever the status of live stream changes, response will be sent to the webhook.

Sample webhook response for livestream is as follows

{
    "title": "Data science Live class",
    "bytes": null,
    "type": "livestream",
    "video": null,
    "id": "4PtERT9d9uK",
    "live_stream": {
        "rtmp_url": "rtmp://23.427.127.24/live",
        "stream_key": "org-4xu8ay-live-4PtERT9d9uK-jKP4",
        "status": "Streaming",
        "hls_url": "https://d28qihy7z761lk.cloudfront.net/live/4xu8ay/4PtERT9d9uK/video.m3u8",
        "start": null,
        "transcode_recorded_video": true,
        "chat_embed_url":"https://app.tpstreams.com/live-chat/4PtERT9d9uK/"
    },
    "parent_id": null
}



Streaming Status Table
Status	Description
Not Started	Live stream server not created or started.
Streaming	The live stream is active, typically streamed via OBS.
Recording	After stopping the live stream, it enters recording state, initiating transcoding.
Disconnected	Live streaming is stopped in OBS, either manually or due to network issues.
Error	Error encountered while starting the live stream.
Completed	Transcoding is completed, transitioning the status to "Completed."
info
When the status of TPStreams changes:

If the status of the live stream changes to Disconnected, initiate a direct reconnection using OBS.
If the status changes to Error, create a new live stream.


# Chat SDK

This SDK enables you to integrate live chat to your website

Adding dependency
Open the HTML file for the page where you want the live chat to appear.
Inside the <head> section, add a new line with this code:
  <link rel="stylesheet" href="https://static.tpstreams.com/static/css/live_chat_v1.css">
  <script src="https://static.tpstreams.com/static/js/live_chat_v1.umd.cjs"></script>


  Create a Container Element
Within the <body> section of your HTML, add a <div> element with a unique ID (e.g., id="app"). This element will serve as the container for the live chat widget. The chat widget will be displayed within this <div> element on your webpage.

<div id="app"></div>

Initializing Chat SDK
 After the script tag including the JavaScript file, add another <script> element to initialize the Live Chat widget using JavaScript:

<script>
    const config = {
        username : "User Name" // Replace with user name
        roomId: "YOUR_ROOM_ID", // Replace with your actual room ID
        title: "Your Chat Title" // Replace with your desired title
    }
    new TPStreamsChat.load(document.querySelector("#app"), config)//replace id with container element id
</script>


Fields

Field	Description
username	The username of the user interacting with chat
roomId	The ID of the chat room
title	The title displayed for the chat interface
info
Note: You can obtain the roomId after creating a live stream. It will be available on the live stream detail page or through the API.

Sample HTML Code
Below is a sample HTML code demonstrating how to integrate the live chat widget into your webpage:

<!DOCTYPE html>
<html lang="en" style="height: 100%">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="stylesheet" href="https://static.tpstreams.com/static/css/live_chat_v1.css">
      <script src="https://static.tpstreams.com/static/js/live_chat_v1.umd.cjs"></script>
  </head>
  <body>
    <div id="app"></div>
    <script>
      const config = {
        username : "Test User",
        roomId: "93b76b94-c9a5-42df-a0af-c196cff1103c",
        title: "Test"
      }
      new TPStreamsChat.load(document.querySelector("#app"), config)
    </script>
  </body>
</html>





# video Embeddings 


Getting started
For any video that you host with Streams, if you want you use it somewhere else, you have to embed it. This means that when you have generated the embed code for your video, you will be able to add the video to your website, blog, articles, or other website you’re looking forward to.

In order to allow embedding for a certain video, you will first need to follow the below steps which will guide you through the whole Video Embedding process

Generate an embed code
Construct iframe source URL:

https://app.tpstreams.com/embed/{{asset_id}}/?access_token={{access_token}}/


Sample format

<div style="padding-top:56.25%;position:relative;"><iframe src="https://app.tpstreams.com/embed/{{asset_id}}/?access_token={{access_token}}/" style="border:0;max-width:100%;position:absolute;top:0;left:0;height:100%;width:100%;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope picture-in-picture" allowfullscreen="" frameborder="0"></iframe></div>

# Aes encryption 

AES Encryption
Advanced Encryption Standard (AES) is a widely used symmetric encryption algorithm designed to secure data.

It employs a block cipher method, transforming data in fixed-size blocks, typically 128 bits. AES operates through a series of rounds involving substitution, permutation, and mixing of data elements, making it highly resistant to attacks.

It offers key lengths of 128, 192, or 256 bits for varying levels of security. AES encryption is widely adopted for its efficiency and robust protection, used in securing sensitive data during transmission and storage

Upload AES Encrypted video
To Upload a asset with AES Encryption you need to send an HTTP POST request to the API Endpoint, with the "content_protection_type" as "aes".

Sample request body

{
  "title": "Big Buck Bunny Video",
  "inputs": [
    {
      "url": "https://static.testpress.in/BigBuckBunny.mp4"
    }
  ],
  "resolutions": ["240p", "360p", "480p", "720p"],
  "content_protection_type": "aes",
  "folder": "32seYYHeNxE"
}


How to play AES Encrypted video
Generate a Signed Playback URL
To successfully access and play AES encrypted videos, it's essential to generate a signed playback URL specifically designed for each video.

To obtain it send an HTTP GET request to the API Endpoint, with the the query parameter 'expiry,' indicating the duration in seconds until the URL expires.

Endpoint

https://app.tpstreams.com/api/v1/<organization_id>/assets/<asset_id>/?expiry=100


The playback_url provided in the API response is the signed URL that you can use for secure video playback.

Response

{
    "title": "sample.mp4",
    "bytes": null,
    "type": "video",
    "video": {
        ....
        ....
        "playback_url": "https://d384padtbeqfgy.cloudfront.net/transcoded_private/B66mmRm2TPF/video.m3u8?Expires=1692398327&Signature=OXqiVfCVAFrNoMq0hrpJ05YYY0XeyzA1H8kD6lv~~71v5PCdpf-9h1Qe~A0RFYoJuOq22j70juEFVJNjEr-WvVPvCvSRoYbRG6xEx5sr-541G~UkBXrcNXRHpb1988hQdG8NAh2pCV6o7bFOKsk3BBk8t6FRo-ZYs6xl46vFN8qH3FCNMhQLFmWqNpNo1vSPjmSSZlNrAplBkNq7MWxoNPxEFrzBgKusqrFZWLqOoXdzR8f9kb9VKkEQAPZL2tk71D6aN8toxwPV70esr8df78hkmAl3d4lChKZlrbWKd0tzew3RDPYZxicxfD1ZBx0th5PQfCltukkitQ0zPbE3TQ__&Key-Pair-Id=K2XWKDWM065EGO",
    },

}



Handle AES-encrypted key request
The player sends a request to our endpoint, as indicated within the m3u8 file, to obtain the AES decryption key needed for video playback. However, the API endpoint mandates an access token for authorization.

To handle this, it's important to ensure that the access token is included in the request as a query parameter initiated by the player.

To generate access tokens send an HTTP GET request to the API Endpoint

Sample video.js code

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video.js HLS Example</title>
    <link href="https://unpkg.com/video.js@7.21.4/dist/video-js.min.css" rel="stylesheet">
    <script src="https://unpkg.com/video.js@7.21.4/dist/video.min.js"></script>
</head>
<body>
    <video id="player" class="video-js vjs-big-play-centered vjs-default-skin" controls preload="auto" width="640"
        height="360">
        <source src="PLAYBACK_SIGNED_URL.m3u8" type="application/x-mpegURL">
    </video>

    <script>
        var player = videojs('player', { html5: { hls: { cacheEncryptionKeys: true } } });

        player.ready(function () {
            player.hls.xhr.beforeRequest = (options) => {
                if (options.uri.includes("aes_key")) {
                    options.uri += `?access_token=YOUR_ACCESS_TOKEN_HERE`;
                    return options;
                }

                return options;
            };
        });
    </script>
</body>

</html>


Replace "PLAYBACK_SIGNED_URL.m3u8" with the actual playback_url of your encrypted video and "YOUR_ACCESS_TOKEN_HERE" with the provided access token.




# Playback Authentication


Access token generated using Streams API which is required to authorize video playback.

If the user has your video embed code he can embed your video onto any page on the internet if you don't have domain restrictions. even if you have, users can view the video by embedding your video on your home page or any other page that doesn't restrict users.

You can prevent the above scenario by generating an access token using API with time-to-live or set to expire after one usage on the back-end server and then sent to the website front-end and use generate access_token as part of the video embed code.




# water mark videos 

Watermark Videos
Videos hosted through Streams cannot be downloaded. There does however remain the risk of piracy from screen capture. Add text to videos with our dynamic watermark feature that effectively prevents users from pirating video content using screen capture, and goes a long way towards helping users protect their premium content.

The dynamic watermark can be customized for movement, color, size and transparency.

Create Watermark Code
Here is a sample JSON string that adds a moving (dynamic) watermark and a static watermark.

{
   "annotations":[
      {
         "type":"static",
         "text":"Testpress",
         "x":10,
         "y":10,
         "opacity":"0.5",
         "color":"#FFF",
         "size":6
      },
      {
         "type":"dynamic",
         "text":"hari",
         "opacity":"0.5",
         "color":"#FF0000",
         "size":6,
         "interval":5000,
         "skip":2000
      }
   ]
}

Technically, this is an array of JSON objects, where each object describe a single annotation item.

Each of these items will be described by its parameters. Every item requires a type parameter which defines the type of watermark by default its value was static. The type of watermark can be either a moving text or a static text. The rest of the parameters depends on the type.

Following is a short description of how each parameter affects the display of text.

Static text
The following code will display a static watermark code, placed at 10px distance from the left border of the video and 50px from top border, displaying text Testpress . The text color will be white (#fff), opacity is 0.5, and font-size is 6.

[{
    "type": "static",
    "text": "Testpress",
    "x": 10",
    "y": 10,
    "opacity": "0.5",
    "color": "#FFF",
    "size": "6"
}]

Moving text
The following code will display a dynamic watermark code, displaying text hari. The text color will be red (#ff0000), opacity is 0.8, and font-size is 6. The watermark is configured to update position every 5 seconds (5000ms).

[{
    'type': 'dynamic',
    'text': 'hari',
    'opacity': '0.8',
    'color': '#FF0000',
    'size': '6',
    'interval': 5000,
    'skip': 2000,
}]

Type of text

Set type parameter as dynamic for Dynamic watermark and static for Static watermark

'type':'dynamic',

Set the text to be shown

'text" : 'testpress',

Specify text opacity

This is the opacity of the text. For full opacity keep value 1.

'opacity':'0.8',

Specify text color

This is the hex value of the watermark text color.

'color':'#FF0000',

Specify the font size

This is the font size

'size':6,

Specify the interval over which watermark changes position

The value is the interval in milliseconds when the text changes position

'interval':5000,

Skip feature for watermark

It is possible to have watermark skip for some time between two overlays. Here is a sample code for it –

'skip':2000

Apply Watermark
Now you just need pass the watermark code that you've created to the player to apply on the video. There are two ways to do that

Pass the code as part of the Access token Request.
Pass the code via Player SDK method called applyWatermark.






# javascript SDK 

About player SDK
Our player SDK enables you to interact with embedded Streams players through the code on your web page. You can modify the default behavior of the player for features like looping, execute custom functions on particular playback events, and even set basic properties like the volume, and playback rate of the player.

The SDK, as a JavaScript library, is completely separate from the API. You connect to it differently, and it gives you a different range of options.




# Using Player SDK
The iframe embed lets you embed your Streams videos and control the player using Javascript. You have access to the essential methods and properties of the players. There are events that you can listen for and execute custom actions in your web application.

Adding the script
Add the following script to the html of your web page. This loads the interface that are used to establish communication with the video player. If this script is loaded on-demand later, make sure to wait for the load to complete before calling subsequent methods on the object.

<script src="https://static.tpstreams.com/static/js/player_v2.js"></script>

Get a reference to the iframe
Note: Assuming the API script (above) is already loaded,

To begin communicating with the player, get a reference to the iframe element. This can be using DOM APIs such as querySelector().

const iframe = document.querySelector("iframe");

Establish communication with the iframe
<html>
<head>
  <title>page_title</title>
</head>
<body>
  <iframe width='560' height='315' src='https://lms.testpress.in/embed/cnwKtQwNmbG' title='DDE video 12' frameborder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen></iframe>
  <script src="https://static.tpstreams.com/static/js/player_v2.js"></script>
  <script>
    var iframe = document.querySelector('iframe');
    var player = new Testpress.Player(iframe);
   
    player.loaded().then(()=>{
      console.log('Player is ready now')
    }); 
    

    player.on('play', function() {
      console.log('Played the video')
    });

        
   player.setCurrentTime(30).then(()=>{
      console.log('Current watch time updated')
    });
  </script>

</body>
</html>




What's next
It's time to start controlling some videos. We've compiled a comprehensive reference of methods and events to make your dreams of absolute power a reality.

If we've confused you going forward, contact us. We tend to get it right the second time.


# Player methods 
Player Methods
About player methods
You can call player methods by calling the corresponding function on the Player object. All player method executes only after the iframe is loaded, so no need to wait for the player to loaded to call the methods.

player.play();

All methods, except for on() and off(), return a Promise — a special JavaScript object that stands for the result of the operation, whether success or failure.

Promises for methods that return information resolve with the value of the property in question.

player.getLoop().then(function(loop) {
  // Whether the player is set to loop
});

Get the playback position of a video
This method gets the current playback position of a video, measured in seconds.

Function

getCurrentTime()

Returns

Promise <number>

Example

player.getCurrentTime().then(function(seconds) {
  // `seconds` indicates the current playback position of the video
});

​

Get the loop state of a player
This method gets the loop state of a player, where true indicates that the video restarts once it reaches the end of playback.

Function

getLoop()

Returns

Promise <boolean>

Example

player.getLoop().then(function(loop) {
  // `loop` indicates whether the loop behavior is active
});

​

Get the pause state of a player
This method gets the pause state of the current player, where true indicates that playback is paused.

Function

getPaused()

Returns

Promise <boolean>

Example

player.getPaused().then(function(paused) {
  // `paused` indicates whether the player is paused
});

​

Get the ended state of a video
This method gets the ended state of the video, where true indicates that the video has ended. The video has ended if its current playback position is exactly equal to its duration.

Function

getEnded()

Returns

Promise <boolean>

Example

player.getEnded().then(function(ended) {
  // `ended` indicates whether the video has ended
});

Get the playback rate of a player
This method gets the playback rate of a player on a scale from 0.5 to 2, where 0.5 is half speed and 2 is double speed.

Function

getCurrentPlaybackRate()

Returns

Promise <number>

Example

player.getCurrentPlaybackRate().then(function(playbackRate) {
  // `playbackRate` indicates the numeric value of the current playback rate
});

Get the volume level of a player
This method gets the volume level of a player on a scale of 0 to 1.

info
Most mobile devices don't support a volume level independent of the system volume. In these cases, this method always returns 1.

Function

getVolume()

Returns

Promise <number>

Example

player.getVolume().then(function(volume) {
  // `volume` indicates the volume level of the player
});

Get the video duration
This method gets the current video duration in seconds.

Function

getDuration()

Returns

Promise <number>

Example

player.getDuration().then(function(duration) {
  // duration 596.4630000000002
});

Get user watched time ranges
This methods returns the list of time ranges that user watched in a video.

Function

played()

Returns

Promise <Array>

Example

player.played().then(function(ranges) {
  // ranges => [[0, 120.084666], [155.292928, 161.054032], ...]
});

Pause a video
This method pauses the playback of a video.

Function

pause()

Returns

Promise <void>

Example

player.pause().then(function() {
  // The video is paused
}).catch(function(error) {
  // Some other error occurred
});

Play a video
This method plays the playback of a video.

Function

play()

Returns

Promise <void>

Example

player.play().then(function() {
  // The video is paused
}).catch(function(error) {
  // Some other error occurred
});

​

Set the playback position of a video
This method sets the current playback position in seconds. The player attempts to seek to as close to the specified time as possible. The exact time comes back as the fulfilled value of the promise.

If playback hasn't started yet, using this method starts playback.
If playback has already started, using this method doesn't affect the play state.

info
If the player is paused, it remains paused. If the player is playing, it buffers the video from the new position and then resumes playing.

Function

setCurrentTime(seconds)

Parameters

Parameter	Data type	Required?	Description
seconds	Number	Yes	The playback position in seconds.
Returns

Promise <number, (RangeError | Error)>

Errors

Error	Description
RangeError	The time is less than 0 or greater than the video's duration.
Error	Some other error occurred.
Example

player.setCurrentTime(30.456).then(function(seconds) {
  // `seconds` indicates the actual time that the player seeks to
}).catch(function(error) {
  switch (error.name) {
    case 'RangeError':
        // The time is less than 0 or greater than the video's duration
        break;
    default:
        // Some other error occurred
        break;
  }
});

​

Set the autoplay state of a player or browser
This method enables or disables autoplay in a player or browser, where true indicates that autoplay is enabled. Under autopause, whenever a new video loads in the browser window, the video begins in a played state. By default autoplay was disabled.

info
The autopause feature has no effect if you've disabled cookies in your browser, either through browser settings or with an extension or plugin.

Function

setAutoPlay({autoplay})

Parameters

Parameter	Data type	Required?	Description
autopause	Boolean	Yes	The autopause state to set.
Returns

Promise <boolean, (UnsupportedError | Error)>

Errors

Error	Description
UnsupportedError	Autopause isn't supported by the current player or browser.
Error	Some other error occurred.
Example

player.setAutoPlay(false).then(function(autopause) {
  // Autoplay is disabled
}).catch(function(error) {
  // Handle errors
});

Set the loop state of a player
This method sets the loop state of the player. When the loop state is true, playback resumes at the beginning of the video immediately after the video ends.

Function

setLoop(loop)

Parameters

Parameter	Data type	Required?	Description
loop	Boolean	Yes	Whether the player loops video playback.
Returns

Promise <boolean>

Example

player.setLoop(true).then(function(loop) {
  // The loop behavior is enabled
});

Set the playback rate of a player
This method sets the playback rate of the player on a scale from 0.5 to 2, where 0.5 is half speed and 2 is double speed. When you set the playback rate through the API, the specified value isn't synchronized to other players or stored as the viewer's preference.

Function

setPlaybackRate(playbackRate)

Parameters

Parameter	Data type	Required?	Description
playbackRate	Number	Yes	The playback rate of the player from 0.5 to 2.
Returns

Promise <number, (RangeError | Error)>**

Errors

Error	Description
RangeError	The playback rate is less than 0.5 or greater than 2.
Error	Some other error occurred.
Example

player.setPlaybackRate(0.5).then(function(playbackRate) {
  // The playback rate is set
}).catch(function(error) {
  switch (error.name) {
    case 'RangeError':
        // The playback rate is less than 0.5 or greater than 2
        break;
    default:
        // Some other error occurred
        break;
  }
});

Set the volume level of a player
This method sets the volume level of the player on a scale from 0 to 1. When you set the volume through the API, the specified value isn't synchronized to other players or stored as the viewer's preference.

Function

setVolume(volume)

Parameters

Parameter	Data type	Required?	Description
volume	Number	Yes	The volume level of the player from 0 to 1.
Returns

Promise <number, (RangeError | Error)>

Errors

Error	Description
RangeError	The volume is less than 0 or greater than 1.
Error	Some other error occurred.
Example

player.setVolume(0.5).then(function(volume) {
  // The volume is set
}).catch(function(error) {
  switch (error.name) {
    case 'RangeError':
        // The volume is less than 0 or greater than 1
        break;
    default:
        // Some other errors occurred
        break;
  }
});

Apply watermark to the video
This method applies watermark to the video. Please refer to this doc for more details on watermarking.

Function

applyWatermark()

Parameters

Parameter	Data type	Required?
annotations	json	Yes
Returns

Promise <void>

Example

const annotations = [
   {
      "type":"dynamic",
      "text":"Dinesh",
      "opacity":"0.8",
      "color":"#FF0000",
      "size":"5",
      "interval":5000,
      "skip": 2000
   }
]
player.applyWatermark(annotations).then(function() {
  // The watermark is applied
})

Enable resume video playback
Assigning a unique ID to a user automatically enables the resume video playback feature across all devices. The user's progress will be saved periodically, ensuring playback resumes from the last saved point when they return.

Function

setPlayerUserId()

Returns

Promise <void>

Example

player.loaded().then(()=>{
  player.setPlayerUserId("shantanu@testpress.in")
}); 

Get the watched duration of a video
This method retrieves the total watched duration of a video, measured in seconds.

Function
getWatchedTime()

Returns
Promise <number>

Example
player.getWatchedTime().then(function(duration) {
  console.log(duration, "user watched duration");
});

This will log the total duration the user has watched the video.

Set custom error messages
This method allows you to customize error messages for specific error types. If a custom message is not provided for an error type, the system's default error message will be used.

Function

setCustomErrorMessage(errorMessages)

Parameters

Parameter	Data type	Required?	Description
errorMessages	Object	Yes	An object containing custom error messages for specific error types.
Supported Error Types

Error Type	Description
BrowserNotSupported	Error when the browser is not supported.
DRMKeySystemUnsupported	Error when the DRM key system is not supported.
NetworkNotAvailable	Error when the network is not available.
DefaultPlaybackError	Default error message for general playback errors.
Returns

Promise <void>

Example

player.setCustomErrorMessage({
  'BrowserNotSupported': 'This browser is not supported.',
  'DRMKeySystemUnsupported': 'A DRM-related error has occurred',
  'NetworkNotAvailable': 'A network error occurred. Please check your internet connection.',
  'DefaultPlaybackError': 'An unknown playback error occurred.'
}).then(function() {
  // Custom error messages are set
});


info
Only the four error types listed above can be customized. If you don't provide a custom message for a specific error type, the system's default error message will be used.

Set custom DRM license endpoint
This method allows you to configure a custom DRM license endpoint for the player. By default, the embedded player directly calls the platform’s DRM license API. Using this method, API clients can instead route DRM license requests through their own endpoint, which can act as a DRM proxy.

This enables clients to:

Inject additional DRM configuration or policies
Customize request payloads before forwarding them
Extend DRM behavior without changing the existing license contract
The configured endpoint receives the DRM challenge from the player, processes or enriches the request as needed, forwards it to the platform’s DRM license API, and returns the license response back to the player.

Function

setDRMURL(url)

Returns

Promise <void>

Example

player.setDRMURL("https://client.example.com/drm-proxy").then(function() {
  // Custom DRM endpoint is configured
}).catch(function(error) {
  // Handle errors
});

Clear custom error messages
This method clears all previously set custom error messages. After calling this method, the player will use the system's default error messages for all error types.

Function

clearCustomErrorMessage()

Returns

Promise <void>

Example

player.clearCustomErrorMessage().then(function() {
  // Custom error messages are cleared, system defaults will be used
});

Request Fullscreen
This method requests the player to enter native fullscreen mode. If the browser allows it, the video will expand to fullscreen. Function

requestFullscreen()

Returns

Promise<void>

Example

player.requestFullscreen();

Exit Fullscreen
This method requests the player to exit native fullscreen mode. If the player is currently in fullscreen, it will return to its embedded state.

Function

exitFullscreen()

Returns

Promise<void>

Example

player.exitFullscreen();

Enable Fullscreen Toggle Visibility
This method shows the fullscreen toggle button in the player’s control bar. After calling this method, users will be able to enter or exit fullscreen using the player UI.

Function

enableFullscreen()

Returns

Promise<void>

Example

player.enableFullscreen();

Disable Fullscreen Toggle Visibility
This method hides the fullscreen toggle button from the player’s control bar. After calling this method, fullscreen can still be controlled programmatically, but not via the player UI.

Function

disableFullscreen()

Returns

Promise<void>

Example

player.disableFullscreen();



# Player Events 

Player Events
About Player events
You can listen for events in the player by attaching a callback using .on()

player.on('ended', function() {
  // Executes when the video is ended
});

The events are equivalent to the HTML5 video events.

To remove a listener, call .off() with the callback function. If you pass an event name only, you remove all listeners for that event.

var onPlay = function() {

};

player.on('ended', onPlay);

// If later you decide that you don't need to listen for `ended`
player.off('ended', onPlay);

// Alternatively, call `off` with just the event name to remove all listeners
player.off('ended');

Events for playback controls
ended
error
loaded
pause
play
progress
seeked
timeupdate
volumechange
ratechange
ended
This event fires when playback reaches the end of a video.

info
When the player's loop behavior is enabled, the ended event doesn't fire.

loaded
This event fires when a new video is loaded in the player.

volume
This event fires when the volume in the player changes.

timeupdate
This event fires when the playback position of the video changes, generally every 250 ms during playback, but the interval can vary depending on the browser.

seeked
This event fires when the player seeks a specific time. A simultaneous timeupdate event also fires.

progress
This event fires while the video is loading. The event data indicates the amount of the video that has been buffered.

play
This event fires when the video plays.

pause
This event fires when the video is paused.

error
This event fires when the player experiences some sort of error. If a method call generated the error, the name of the method appears in the event data, along with the name of the error.

ratechange
This event fires when the playback rate of the video in the player changes.


# Custom Overlays 

Custom Overlays
The Custom Overlay feature allows you to display interactive HTML content over the video player at specific times or on demand. Typical use cases include:

Quizzes
Polls / Voting
Feedback forms
Call-to-action buttons
Announcements / Informational content
Overlays can appear automatically at a timestamp or be triggered programmatically via player.showOverlay().

Overlay Configuration
Property	Type	Required	Description
id	string	Yes	Unique identifier for the overlay
contentHtml	string	No	HTML content to display in the overlay
showAt	number	No	Video timestamp (seconds) to show overlay
hideAt	number	No	Video timestamp (seconds) to hide overlay
className	string	No	CSS class name for custom styling
verticalAlign	'top' | 'center' | 'bottom'	No	Vertical position (default: 'center')
horizontalAlign	'left' | 'center' | 'right'	No	Horizontal position (default: 'center')
Default behavior

If showAt is not set, the overlay appears immediately.
If hideAt is not set, it stays until user interaction.
If className is not set, default styling is applied.
Alignment defaults to center.
Methods
showOverlay Displays an overlay over the video player.

player.showOverlay({
  id: 'quiz-overlay',
  contentHtml: '<div>Content here</div>',
  showAt: 30,
  hideAt: 60,
  className: 'custom-overlay'
});

Events
onOverlayShow

Triggered when an overlay becomes visible.

player.on('onOverlayShow', id => {
  console.log('Overlay shown:', id);
});

onOverlayHide

Triggered when an overlay is hidden or dismissed.

player.on('onOverlayHide', id => {
  console.log('Overlay hidden:', id);
});

overlayAction

Triggered when a user interacts with elements inside an overlay (buttons, form submissions, etc.).

player.on('overlayAction', data => {
  console.log('Button clicked:', data.value, 'in overlay:', data.id);
});

Event Data

{
  type: 'overlayAction',
  id: overlayId,
  value: buttonValue
}

Styling
Default overlays cover the full video and center the content. You can customize appearance using className.

.quiz-overlay {
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 20px;
  border-radius: 10px;
}

.cta-overlay button {
  background: #007bff;
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  margin: 5px;
}

.poll-overlay label {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  margin-bottom: 10px;
  background: #f0f0f0;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

Use unique overlay IDs to prevent conflicts.
Use data-value attributes on buttons for easy event handling.
Test timing (showAt / hideAt) to ensure good UX.
Keep content concise and mobile-friendly.
Ensure accessibility: proper contrast, keyboard navigation.





# player parameters 


Player Parameters
About Player Parameters
Player parameters are query parameters that you can append to the playback_url to configure the player's behavior. These parameters allow for a customized playback experience by controlling features such as mute, autoplay, looping, and more directly through the URL.

Parameters Overview
The following query parameters can be added to the playback_url to control the player's settings:

Parameter	Data Type	Values	Description
background	String	'1' or '0'	Enables or disables background mode. '1' enables it, '0' disables it.
muted	String	'1' or '0'	Mutes or unmutes the player. '1' mutes the player, '0' unmutes it.
autoplay	String	'1' or '0'	Controls autoplay. '1' enables autoplay, '0' disables it.
loop	String	'1' or '0'	Enables or disables loop mode. '1' enables looping, '0' disables it.
playRates	String	Comma-separated values (e.g., "0.5,1,2,3")	Sets available playback speed options. Minimum value: 0.5, Maximum value: 4.
Usage
These parameters are appended to the playback_url in the format key=value. Multiple parameters can be included by separating them with an ampersand (&).

Example Usage
https://app.tpstreams.com/embed/dcek2m/BxDe5ZYDyD6/?access_token=72186a33-107a-49b6-b275-a853c907be33&muted=1&autoplay=1&loop=1&playRates=0.5,1,2,3


Detailed Description
background: Controls whether the player operates in background mode, useful for scenarios where the video should continue playing in the background.
muted: Sets whether the video should start muted. If set to '1', the video will begin without sound, which is especially useful in autoplay scenarios.
autoplay: Determines whether the video will start playing as soon as the player is ready. Setting this to '1' enables autoplay.
loop: Defines whether the video will automatically restart from the beginning after it finishes. A value of '1' enables looping.
Sample format

<div style="padding-top:56.25%;position:relative;"><iframe src="https://app.tpstreams.com/embed/{{asset_id}}/?access_token={{access_token}}&autoplay=1" style="border:0;max-width:100%;position:absolute;top:0;left:0;height:100%;width:100%;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope picture-in-picture" allowfullscreen="" frameborder="0"></iframe></div>


Embed on your site
Now you use constructed iframe code in your code to embed the video.

Example

Live Editor
<html>
<body>

<div style={{ paddingTop: '56.25%', position: 'relative'}}><iframe src="https://app.tpstreams.com/embed/dcek2m/BxDe5ZYDyD6/?access_token=72186a33-107a-49b6-b275-a853c907be33&autoplay=1" style={{ border: 0, maxWidth: '100%', position: 'absolute', top:0, left:0, height:'100%', width:'100%' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope picture-in-picture" allowfullscreen="" frameborder="0"></iframe></div>


</body>
</html>
<html>
<body>

<div style={{ paddingTop: '56.25%', position: 'relative'}}><iframe src="https://app.tpstreams.com/embed/dcek2m/BxDe5ZYDyD6/?access_token=72186a33-107a-49b6-b275-a853c907be33&autoplay=1" style={{ border: 0, maxWidth: '100%', position: 'absolute', top:0, left:0, height:'100%', width:'100%' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope picture-in-picture" allowfullscreen="" frameborder="0"></iframe></div>


</body>
</html>





# Video Uploaders 

Javascript Uploader
Introduction
If you would like to upload videos without using the embedded uploader UI, you can use our javascript SDK that provides methods to upload videos, and track its progress.

Guide to integrate the uploader
This guide will help you integrate the TPStreams video uploader SDK into your website allowing you to upload videos directly to your TPStreams account.

Step 1: Get the Authentication Token
Use the API mentioned here to obtain a user authentication token. This token is required for the uploader to authenticate uploads.

Step 2: Import the TPStreams Uploader SDK
Include the TPStreams Uploader SDK script in your webpage. Add the following <script> tag in the <head> or right after the starting <body> tag:

<script src="https://static.testpress.in/static/js/tpstreams-uploader.min.js"></script>


Step 3: Initialize the uploader instance
Make sure to replace the organization id with your own TPStreams organization ID. Click here to know more about the uploader configuration options.

<script>
  const authToken = '5f34asdd8aec31adfgfc7dee2bc70ab18dbf0a9cf592aghjd9e63c148362cdf595e008bec1';
  const orgId = "abcdefg";
  const uploaderConfig = {
    generateSubtitle: true,
    contentProtectionType: "aes"
  };
  const uploader = new TpStreamsUploaderSDK(authToken, orgId, uploaderConfig);
</script>


Step 4: Select files and start upload
After you've created a file input on your webpage, you can pass those files to the uploader instance. You can pass an optional folder id argument to upload method if you'd like to upload the videos to a specific folder.

<script>
  document.getElementById('uploadButton').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    uploader.selectFiles([file]);
    uploader.upload(folderId="rPHYq8X5f9d");
  });
</script>

Full Example Code
The following code will display the video upload progress and asset ID on your webpage.

<html>
  <head>
    <title>Video Upload with JS SDK</title>
    <script src="https://static.testpress.in/static/js/tpstreams-uploader.min.js"></script>
  </head>
  <body>
    <h1>Upload Video Using TpStreams Uploader SDK</h1>
    <input type="file" id="fileInput" accept="video/*">
    <button id="uploadButton">Upload Video</button>
    <div id="upload_progress"></div>
    <div id="status"></div>
    
    <script>
      const authToken = '5ffc7dee2bc70ab18dbf0a9cf592ad9e63c148362cdf595e008bec1';
      const orgId = "abcdef";
      const uploaderConfig = {generateSubtitle: false, contentProtectionType: "aes"};
      const uploader = new TpStreamsUploaderSDK(authToken, orgId, uploaderConfig);

      uploader.on('uploadProgress', (data) => {
          document.getElementById("upload_progress").innerHTML = `Progress for asset ${data.asset_id}: ${data.progress_percentage}%`;
      });

      uploader.on('uploadSuccess', (data) => {
        console.log(`${data.name}, with asset ID ${data.asset_id} has been uploaded. Transcoding Status: ${data.status}`)
        document.getElementById('status').innerHTML = "Uploading was successful.";
      });

      uploader.on('uploadError', (data) => {
        console.log(`An error occurred while uploading ${data.name}, with asset ID ${data.asset_id}. Transcoding Status: ${data.status}. Error: ${data.error}`)
        document.getElementById('status').innerHTML = "Uploading has failed";
      });

      document.getElementById('uploadButton').addEventListener('click', () => {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];

        if (file) {
            uploader.selectFiles([file]);
            uploader.upload();
        } else {
            alert('Please select a video file to upload.');
        }
      });
    </script>
  </body>
</html>



Uploader Configuration Options
You can pass the following configuration options to the uploader while initializing using the uploaderConfig argument.

uploaderConfig

Parameter	Description	Type
generateSubtitle	Auto-generate english subtitles for $0.071 per minute of video. False by default.	Boolean
contentProtectionType	Choose encryption standard to safeguard your videos. DRM encryption is enabled by default.	String ("drm", "aes" or "disabled")
resolutions	Choose the resolutions in which you want to transcode the videos. By default they will be transcoded in all available resolutions.	List of string ["240p", "360p", "480p", "720p"]
Uploader Events
You can listen for events in the uploader by attaching a callback using .on()

uploadProgress
Listen to this event to track video upload progress.

<script>
  uploader.on('uploadProgress', (data) => {
    document.getElementById("upload_progress").innerHTML = `Progress for asset ${data.asset_id}: ${data.progress_percentage}%`;
  });
</script>


uploadSuccess
This event is fired when a video is successfully uploaded to TpStreams.

<script>
  uploader.on('uploadSuccess', (data) => {
    console.log(`${data.name}, with asset ID ${data.asset_id} has been uploaded. Transcoding Status: ${data.status}`)
  });
</script>


uploadError
This event is fired when an error occurs while uploading a video to TpStreams.

<script>
  uploader.on('uploadError', (data) => {
    console.log(`An error occurred while uploading ${data.name}, with asset ID ${data.asset_id}. Transcoding Status: ${data.status}. Error: ${data.error}`)
  });
</script>




# transcoding service 



    "input_path": "s3://example-bucket/video.mp4/?access_key=<access_key>&secret_key=<secret_key>&region=<region>",
    "output_path": "s3://example-bucket/path/?access_key=<access_key>&secret_key=<secret_key>&region=<region>",
    "resolutions": ["240p", "480p"],
    "enable_drm": true,
    "client_metadata": {
        "client_id": "12345",
        "project": "marketing_campaign_2024"
    }
}


Here's a breakdown of the fields in the payload:

Name	Description
input_url	The URL of the input video file you want to transcode. OR The S3 bucket path of the input video file. If using the S3 path, ensure the access_key , secret_key and region match the bucket's credentials.
output_path	The S3 bucket path where the transcoded video files will be stored (e.g., s3://bucket/path/). Credentials (access_key, secret_key, region) may be included as query parameters, or omitted if storage is configured for your account. See the note below for more details.
resolutions	An array of resolutions for transcoding the video. Specify multiple resolutions as needed. Options include 240p, 360p, 480p, 720p, and 1080p.
enable_drm	(Optional) This flag allows you to enable Digital Rights Management (DRM) for your video. When set to true, your content will be encrypted using Widevine and Fairplay, and a drm_content_id will be returned in the response. This ID is required to generate playback licenses. Defaults to false.
client_metadata	(Optional) A JSON object containing custom metadata for your reference. This metadata will be returned in the job response and webhook notifications. Maximum size: 10 KB.
info
output_path : Storage credentials (access_key, secret_key, and region) are optional. You may omit them if storage is configured for your account. If storage is not configured, please contact TPStreams Support to enable it before omitting these fields.
client_metadata : This field is optional and can be used to store custom data for your internal purposes (e.g., tracking client IDs, project names, or reference information). The server does not modify or interpret this data—it stores and returns it exactly as provided in API responses and webhook notifications.
Response
Upon a successful request, you will receive a response like below with information about the transcoding job, including a unique job ID. You can use this job ID to monitor the progress and check the status of your transcoding job.

{
    "id": "5KQfnXCg8Qh",
    "resolutions": [
        "240p",
        "480p"
        ],
    "video_duration": null,
    "status": "Queued",
    "enable_drm": true,
    "drm_content_id": "8216dcdb90c34a4f8abf1671630a8817",
    "input_url": "https://example.com/input-video.mp4",
    "output_path": "s3://example-bucket/path/?access_key=<access_key>&secret_key=<secret_key>&region=<region>",
    "start_time": null,
    "end_time": null,
    "error_message": null,
    "client_metadata": {
        "client_id": "12345",
        "project": "marketing_campaign_2024"
    }
}


info
In case of transcoding errors, details will be provided in the "error_message" field of the response.

Get notified on status change
We offer webhook integration to keep you informed about the status and progress of your transcoding jobs in real-time. With webhook integration, you can receive notifications as soon as your job status changes, making it easier to track and manage your video transcoding tasks.

To register a webhook for your organization, Please check webhook documentation.

Upon registering a webhook, you will receive a status change along with information about your transcoding job. Here is an example of the response you might receive:

{
    "id": "5KQfnXCg8Qh",
    "resolutions": [
        "240p",
        "480p"
    ],
    "video_duration": null,
    "status": "transcoding",
    "enable_drm": true,
    "drm_content_id": "8216dcdb90c34a4f8abf1671630a8817",
    "input_url": "https://example.com/input-video.mp4",
    "output_path": "s3://example-bucket/path/?access_key=<access_key>&secret_key=<secret_key>&region=<region>",
    "start_time": "2023-11-22T12:30:00Z",
    "end_time": null,
    "error_message": null,
    "client_metadata": {
        "client_id": "12345",
        "project": "marketing_campaign_2024"
    }
}


info
The drm_content_id is required to generate playback licenses.

Playing DRM Protected Content
If you enabled DRM, the response includes a drm_content_id. You will need to use this ID as the content_id when generating a signed license token for playback.


# List all Transcoding Jobs
To list all transcoding jobs, make a GET request to the following API endpoint, with the authentication Header.

https://app.tpstreams.com/api/v1/<organization_id>/transcoding_jobs/

Replace <organization_id> with your organization's unique identifier.

Query Parameters
You can filter and order the list of transcoding jobs using the following query parameters:

Parameter	Type	Description
status	string	Filter jobs by status. You can provide multiple statuses by repeating the parameter.
Options: queued, transcoding, completed, error.
enable_drm	boolean	Filter jobs by whether DRM is enabled (true) or disabled (false).
created_from	string	Filter jobs created on or after this date and time (ISO 8601 format).
created_to	string	Filter jobs created on or before this date and time (ISO 8601 format).
ordering	string	Order the jobs by creation time.
Options: -created (Latest first), created (Oldest first).
Example request with filters
https://app.tpstreams.com/api/v1/<organization_id>/transcoding_jobs/?status=completed&enable_drm=true&created_from=2023-04-20T00:00:00Z&ordering=-created

Sample Response
The response is paginated and contains a list of transcoding jobs.

{
    "count": 42,
    "next": "https://app.tpstreams.com/api/v1/<organization_id>/transcoding_jobs/?page=2",
    "previous": null,
    "results": [
        {
            "id": "5KQfnXCg8Qh",
            "resolutions": [
                "240p",
                "480p"
            ],
            "video_duration": 120,
            "status": "completed",
            "input_url": "https://example.com/input-video.mp4",
            "output_path": "s3://example-bucket/path/?access_key=<access_key>&secret_key=<secret_key>&region=<region>",
            "start_time": "2023-04-20T23:20:06.034924+12:00",
            "end_time": "2023-04-20T23:40:06.034924+12:00",
            "error_message": null,
            "enable_drm": true
        },
        {
            "id": "7XkLp9mN2O",
            "resolutions": [
                "720p"
            ],
            "video_duration": 300,
            "status": "queued",
            "input_url": "https://example.com/another-video.mp4",
            "output_path": "s3://example-bucket/another-path/?access_key=<access_key>&secret_key=<secret_key>&region=<region>",
            "start_time": null,
            "end_time": null,
            "error_message": null,
            "enable_drm": false
        }
    ]
}



# Get Transcoding Job detail

To retrieve the details of a transcoding job, make a GET request to the following API endpoint , with the authentication Header.

https://app.tpstreams.com/api/v1/<organization_id>/transcoding_jobs/<job_id>/

Replace <organization_id> with your organization's unique identifier and <job_id> with the specific job ID you want to retrieve details for.

Sample Response
{
    "id": "5KQfnXCg8Qh",
    "resolutions": [
        "240p",
        "480p"
    ],
    "video_duration": 120,
    "status": "Completed",
    "input_url": "https://example.com/input-video.mp4",
    "output_path": "s3://example-bucket/path/?access_key=E8WPS6H1A4OYD3ZNVMR&secret_key=N1dYpS2cTk5AeH6jWf8TgBh9Ji0MkL1N2O3P",
    "start_time": "2023-04-20T23:20:06.034924+12:00",
    "end_time": "2023-04-20T23:40:06.034924+12:00",
    "error_message": null,
    "client_metadata": {
        "client_id": "12345",
        "project": "marketing_campaign_2024"
    }
}


# Cancel Transcoding Job

To cancel a transcoding job, you need to send an HTTP DELETE request to the API Endpoint , with the authentication Header.

Endpoint

https://app.tpstreams.com/api/v1/<organization_id>/transcoding_jobs/<job_id>/

Response

Upon a successful cancellation request, the API will respond with a message confirming the cancellation. Here is an example of the response you might receive:

{
    "message": "Job cancelled successfully."
}

In case the job has already been completed, the API will respond with a message indicating that the job is already done:

{
    "message": "Job is already completed."
}

info
You can only cancel transcoding jobs that are not in a completed status.