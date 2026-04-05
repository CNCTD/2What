---
title: Finding Hidden Gems: Datamining the Geometry Dash Servers to Uncover Forgotten Levels
description: Using unconventional server requests and comment history endpoints to locate and archive unrated Geometry Dash levels without manual review.
date: 2025-01-01
tags: [geometry-dash, datamining, python, reverse-engineering, archival]
---

# Finding Hidden Gems: Datamining the Geometry Dash Servers to Uncover Forgotten Levels

## Abstract

Currently, Geometry Dash has somewhere in the range of 137 million user-created levels. Many of these have been forgotten over time and left unrated. In an effort to locate levels that may have gone unrated for years, I utilized unconventional server requests via user comments to compile and filter levels based on arbitrary characteristics. This enables the location and archival of older levels without manually checking through hundreds of thousands of levels by hand.

---

## Introduction

If you're reading this, you're likely already aware of at least some of the inner workings of the Geometry Dash client or server. It's become something of a well-known fact that the Geometry Dash server has no open API for external use beyond the game client itself. As a result, using external libraries within Rust or Python has become standard for fetching data from Geometry Dash without dealing with manual response parsing.

For the scope of this project, I stuck to raw requests in Python, as I only needed two specific endpoints.

### Endpoints Used

**`getGJCommentHistory`**

The first, and most crucial, endpoint is `getGJCommentHistory`. This endpoint is straightforward — it fetches a list of comments from a specific user via `playerID`, and results can be sorted by recency or most-liked.

**`getGJLevels21`**

The second endpoint is `getGJLevels21`, which has a plethora of options for querying the server for levels without downloading all associated level data. Within this project, the main parameter changed was the search type. The `type` parameter has 22 filters available, though I only used types `26` and `18`, which I will detail further in this writeup.

{% callout type="note" %}
Neither of these endpoints is officially documented. Their behavior has been reverse-engineered by the Geometry Dash community over time.
{% /callout %}

---

## Fetching the Comments

With our two endpoints in hand, the next question is: whose comments do we actually pull? This is an interesting problem — do you target the best creators because they may have encountered the most levels, or the best players because they've beaten so many? My approach was to use the Geometry Dash moderators list. This group has already been tasked with finding the best levels, making them an ideal starting point.

Conveniently, the list of all current and past moderators is publicly available at [geometrydashmoderators.jimdofree.com](https://geometrydashmoderators.jimdofree.com/home/gd-moderators-list/). From there, the next step is obtaining each moderator's `playerID` to pass to `getGJCommentHistory`. While this can be fetched via another server request, making excessive requests isn't great practice, so I opted to manually pull a list of `playerID`s once from [GDBrowser.com](https://gdbrowser.com) and save them locally for reuse.

### Making the Request

With a list of player IDs ready, fetching comments for a given user is straightforward. Here's a base-level example using longtime moderator and talented creator, Ryder:

```python
import requests

# Fetch Ryder's most recent page of comments
data = {
    "userID": 3935672,  # Ryder's player ID
    "page": 0,
    "mode": 0,          # sorted by recency
    "secret": "Wmfd2893gb7"
}

req = requests.post("http://boomlings.com/database/getGJCommentHistory.php", data=data)
print(req.text)
```

To fetch larger histories, you'd iterate through a predetermined number of pages and abstract this into a reusable function. Keep in mind that each page is a separate request, so be mindful of the load you're placing on the server.

### Parsing the Response

The response contains a lot of information, but the only fields we care about are:

- **Key `1`** — level ID
- **Key `2`** — comment content (base64 encoded)
- **Key `9`** — comment age

The comment content arrives base64 encoded and must be decoded before use. After decoding, you're left with an easy-to-store list of comments, level IDs, and comment ages to work with downstream.

{% callout type="warning" %}
**A note on ethics:** At the time this script was originally written, comment scraping worked regardless of a user's privacy settings. This has since been amended, which reduces the practicality of this approach somewhat — but it's a welcome change for player security overall.
{% /callout %}

---

## Fetching the Levels

At this point we have a list of level IDs, but not actual level data. For all we know, half of them could be deleted or unlisted. We could query `getGJLevels21` with each ID individually, but that's unnecessary strain on the server. This is where the `type` parameter becomes invaluable.

**Type `26`** allows you to supply a list of up to 100 IDs in a single request, and the server returns metadata for all levels that currently exist — in one round trip. Here's a simple implementation:

```python
def fetch_levels(ids):
    response = requests.post(
        "http://www.boomlings.com/database/getGJLevels21.php",
        data={"str": ",".join(ids), "type": "26", "secret": "Wmfd2893gb7"}
    )
    levels = []
    for chunk in response.text.split("#")[0].split("|"):
        pairs = chunk.split(":")
        fields = dict(zip(pairs[::2], pairs[1::2]))
        levels.append({
            "id":        fields.get("1"),
            "name":      fields.get("2"),
            "downloads": fields.get("10"),
            "length":    fields.get("15"),
            "stars":     fields.get("18"),
        })
    return levels
```

This returns a list of dict objects representing each level. The actual response object contains dozens more properties, but for our filtering purposes these five are sufficient. With `stars` (key `18`) we can identify unrated levels, and with `length` (key `15`) we can filter for completed, full-length levels rather than test builds or short throwaway entries.

### Combining Comments and Levels

By joining this level data with our earlier comment list, we can also see what the moderator who left the comment actually said about the level — providing an additional layer of filtering. If the comment was negative, that level can be deprioritized or excluded from the results entirely, leaving us with a much more targeted set of overlooked gems to investigate.
