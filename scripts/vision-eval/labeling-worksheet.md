# Vision-eval labeling worksheet

Generated 2026-04-26T22:10:58.218Z
12 listings to label.

## How to use this

1. Open this file in a Markdown viewer (VS Code preview, GitHub-rendered, etc.)
2. Open `labels.json` in your code editor
3. For each listing below: click the Zillow link, look at the photos, decide what you actually see
4. In `labels.json`, set the value for each field you can confidently judge (and remove or null out any you can't)
5. The "prior analysis" line below is *only a hint* — verify it against the photos, don't blindly trust

### Valid values

- **floorType:** hardwood, engineered, carpet, tile, vinyl, laminate, concrete, bamboo
- **countertopType:** quartz, granite, marble, laminate, tile, butcher-block, concrete
- **appliancePalette:** stainless, black, white, mixed
- **ceilingHeight:** high, standard, low
- **naturalLight:** bright, moderate, poor
- **overallAge:** new (clearly new construction), updated (recent renovation), dated (original or 70s/80s untouched)

### Tips

- **Skip fields you can't tell.** Leaving a field as null is better than guessing — guessing biases the eval against the models in different ways.
- **The hard cases are the interesting ones.** If a kitchen *looks* updated but the cabinets are clearly original raised-panel oak with new pulls, that's a cosmetic update — write that observation in `judgmentCalls` so we can spot-check whether models caught it.
- **Aim for ~5-15 minutes per listing.** If you're spending more, just skip the field.

---

## 1. 7622 Windmill Ln, Garland, TX

- **Zillow:** https://www.zillow.com/homedetails/27051885_zpid/
- **Photo count:** 40
- **Hard-case heuristic score:** 3 (higher = more ambiguous)

**Prior analysis (hint, do not trust blindly):** floors: hardwood, countertops: granite, appliances: unknown, ceilings: high, age: updated

> _Home was built in 1980 but listing confirms a fresh full interior repaint just completed and updated primary bathroom with spa-inspired finishes. Exterior and interior photos confirm well-maintained condition with classic traditional architecture; living room photo appears to be virtually staged._

### First 6 photos (preview — see Zillow for the rest)

![](https://photos.zillowstatic.com/fp/7e8c035b33e97acd72ad705d1282becb-p_f.jpg)
![](https://photos.zillowstatic.com/fp/da77bcfae293ca8fcbd5bc9da0ea3ee3-p_f.jpg)
![](https://photos.zillowstatic.com/fp/f606319c8584a2f3d3a83fc59616ce78-p_f.jpg)
![](https://photos.zillowstatic.com/fp/767f412e7350bad820a41f2f1be2d7e1-p_f.jpg)
![](https://photos.zillowstatic.com/fp/95589662ce018050437e05b267a9d401-p_f.jpg)
![](https://photos.zillowstatic.com/fp/933a13a37ad250f1355b33e5bebbd200-p_f.jpg)

**`labels.json` zillowId for this listing:** `27051885`

---

## 2. 3524 Gonzales St #2A, Austin, TX

- **Zillow:** https://www.zillow.com/homedetails/460651697_zpid/
- **Photo count:** 36
- **Hard-case heuristic score:** 3 (higher = more ambiguous)

**Prior analysis (hint, do not trust blindly):** floors: unknown, countertops: unknown, appliances: unknown, ceilings: unknown, light: unknown, age: unknown

### First 6 photos (preview — see Zillow for the rest)

![](https://photos.zillowstatic.com/fp/3c96fbb050140d1cff5047b5ff4ffdec-p_f.jpg)
![](https://photos.zillowstatic.com/fp/eae12e52c1a4df3708a8884769e98de1-p_f.jpg)
![](https://photos.zillowstatic.com/fp/e8b9c7680d947bfe97011ed95cbffaa4-p_f.jpg)
![](https://photos.zillowstatic.com/fp/010e869820d7f7e9733ee3ac7418bb06-p_f.jpg)
![](https://photos.zillowstatic.com/fp/d7254963c09f17fc88da04b515da8c14-p_f.jpg)
![](https://photos.zillowstatic.com/fp/6b9c4e1b2b889a0075465d42d4c63cb8-p_f.jpg)

**`labels.json` zillowId for this listing:** `460651697`

---

## 3. 6804 Meadow Run, Austin, TX

- **Zillow:** https://www.zillow.com/homedetails/29497667_zpid/
- **Photo count:** 34
- **Hard-case heuristic score:** 3 (higher = more ambiguous)

**Prior analysis (hint, do not trust blindly):** floors: unknown, countertops: unknown, appliances: unknown, ceilings: unknown, light: unknown, age: unknown

### First 6 photos (preview — see Zillow for the rest)

![](https://photos.zillowstatic.com/fp/8ee4f54f772e231578fba93e9d5836fe-p_f.jpg)
![](https://photos.zillowstatic.com/fp/c38dbd6a9d4ab8a87c2b5e3e3baee152-p_f.jpg)
![](https://photos.zillowstatic.com/fp/9f692897d7d81a7f48a6ceb9bf39626f-p_f.jpg)
![](https://photos.zillowstatic.com/fp/0a846ef6c6498311d6bf5d0f0cc757c5-p_f.jpg)
![](https://photos.zillowstatic.com/fp/2792779d4ecbf04b4119d6f98dc18398-p_f.jpg)
![](https://photos.zillowstatic.com/fp/a1486d52f85c4042cabde806a821f43d-p_f.jpg)

**`labels.json` zillowId for this listing:** `29497667`

---

## 4. 9709 Cottle Dr, Austin, TX

- **Zillow:** https://www.zillow.com/homedetails/29424070_zpid/
- **Photo count:** 32
- **Hard-case heuristic score:** 3 (higher = more ambiguous)

**Prior analysis (hint, do not trust blindly):** floors: unknown, countertops: unknown, appliances: unknown, ceilings: unknown, light: unknown, age: unknown

### First 6 photos (preview — see Zillow for the rest)

![](https://photos.zillowstatic.com/fp/b6bb104825f1d6f158f3b89dff3acee2-p_f.jpg)
![](https://photos.zillowstatic.com/fp/3a682beaa08d0a633b1c9c40bf1c70cd-p_f.jpg)
![](https://photos.zillowstatic.com/fp/3a9cb7378b83d16140556af7bb1093f0-p_f.jpg)
![](https://photos.zillowstatic.com/fp/9a46ac793b683290278ba579ad497475-p_f.jpg)
![](https://photos.zillowstatic.com/fp/b9850debe5c581ed810db11781d25c64-p_f.jpg)
![](https://photos.zillowstatic.com/fp/2332fbb648fc076abf8596287a2555b5-p_f.jpg)

**`labels.json` zillowId for this listing:** `29424070`

---

## 5. 9642 Wakefield St, Frisco, TX

- **Zillow:** https://www.zillow.com/homedetails/337790011_zpid/
- **Photo count:** 26
- **Hard-case heuristic score:** 3 (higher = more ambiguous)

**Prior analysis (hint, do not trust blindly):** floors: unknown, countertops: unknown, appliances: unknown, ceilings: unknown, light: unknown, age: unknown

### First 6 photos (preview — see Zillow for the rest)

![](https://photos.zillowstatic.com/fp/0c6382926719d27bba019b2ac402f161-p_f.jpg)
![](https://photos.zillowstatic.com/fp/5a8ee1322c22af23646399f4c9a0ce76-p_f.jpg)
![](https://photos.zillowstatic.com/fp/012d42c35eb92d980d52ea4d58ef2374-p_f.jpg)
![](https://photos.zillowstatic.com/fp/785b5e87b866d9ef81262b960df4aa44-p_f.jpg)
![](https://photos.zillowstatic.com/fp/ef25eac11e82d318461b67fe3e3e3a75-p_f.jpg)
![](https://photos.zillowstatic.com/fp/03356fc09ad8fa87d0804629ad466265-p_f.jpg)

**`labels.json` zillowId for this listing:** `337790011`

---

## 6. 3101 Brigham Ct, Austin, TX

- **Zillow:** https://www.zillow.com/homedetails/29359992_zpid/
- **Photo count:** 40
- **Hard-case heuristic score:** 3 (higher = more ambiguous)

**Prior analysis (hint, do not trust blindly):** floors: unknown, countertops: unknown, appliances: unknown, ceilings: unknown, light: unknown, age: unknown

### First 6 photos (preview — see Zillow for the rest)

![](https://photos.zillowstatic.com/fp/fcee7146da5871250b5fe55afd6ed0cd-p_f.jpg)
![](https://photos.zillowstatic.com/fp/fd8c855ad97ca1b20b4f661f7f22c6f4-p_f.jpg)
![](https://photos.zillowstatic.com/fp/b4da7dd3c6b403bb867e49b90a852137-p_f.jpg)
![](https://photos.zillowstatic.com/fp/8210e02a724c0cabbd20d5f88bee210c-p_f.jpg)
![](https://photos.zillowstatic.com/fp/8d8fb7a24730dd1dbb94d0e30a1e7c72-p_f.jpg)
![](https://photos.zillowstatic.com/fp/86d03e7b7486a439f2e292a4896c756d-p_f.jpg)

**`labels.json` zillowId for this listing:** `29359992`

---

## 7. 1206 Luna St #2, Austin, TX

- **Zillow:** https://www.zillow.com/homedetails/2057329156_zpid/
- **Photo count:** 30
- **Hard-case heuristic score:** 3 (higher = more ambiguous)

**Prior analysis (hint, do not trust blindly):** floors: unknown, countertops: unknown, appliances: unknown, ceilings: unknown, light: unknown, age: unknown

### First 6 photos (preview — see Zillow for the rest)

![](https://photos.zillowstatic.com/fp/77ce430e417411e280f6f9a6b9eb0c25-p_f.jpg)
![](https://photos.zillowstatic.com/fp/2d0c3085c9dccaa9ee35daea05b8656d-p_f.jpg)
![](https://photos.zillowstatic.com/fp/c03d118860fb8ab0fbc1f4cb4c04089d-p_f.jpg)
![](https://photos.zillowstatic.com/fp/6a559ce14461e7687458839aea3443e1-p_f.jpg)
![](https://photos.zillowstatic.com/fp/68142628bd404473a9a0d71c5e4e3f03-p_f.jpg)
![](https://photos.zillowstatic.com/fp/25ef21a29f1c8cd6414f607914ff9f26-p_f.jpg)

**`labels.json` zillowId for this listing:** `2057329156`

---

## 8. 9405 Graceland Trl, Austin, TX

- **Zillow:** https://www.zillow.com/homedetails/29596396_zpid/
- **Photo count:** 40
- **Hard-case heuristic score:** 3 (higher = more ambiguous)

**Prior analysis (hint, do not trust blindly):** floors: unknown, countertops: unknown, appliances: unknown, ceilings: unknown, light: unknown, age: unknown

### First 6 photos (preview — see Zillow for the rest)

![](https://photos.zillowstatic.com/fp/65c4e80892d81dae37adbcbd2a65baa9-p_f.jpg)
![](https://photos.zillowstatic.com/fp/a633bedddc00fd3616af9c1dd7ee333b-p_f.jpg)
![](https://photos.zillowstatic.com/fp/0c72a6e4d7374167087d9cff86b57d2f-p_f.jpg)
![](https://photos.zillowstatic.com/fp/d6ed0430892f5782f46e88cc7defde7a-p_f.jpg)
![](https://photos.zillowstatic.com/fp/92482a58f59a9eb29d54f52c08fe6625-p_f.jpg)
![](https://photos.zillowstatic.com/fp/61a8dce101f445359116129d854a560b-p_f.jpg)

**`labels.json` zillowId for this listing:** `29596396`

---

## 9. 9101 Echo Point Cv, Austin, TX

- **Zillow:** https://www.zillow.com/homedetails/29363148_zpid/
- **Photo count:** 34
- **Hard-case heuristic score:** 3 (higher = more ambiguous)

**Prior analysis (hint, do not trust blindly):** floors: unknown, countertops: unknown, appliances: unknown, ceilings: unknown, light: unknown, age: unknown

### First 6 photos (preview — see Zillow for the rest)

![](https://photos.zillowstatic.com/fp/a120c6cbdf49e1fdbc58c839b50cf6bf-p_f.jpg)
![](https://photos.zillowstatic.com/fp/9710340b6ddb7fd8b18c43b2643e4118-p_f.jpg)
![](https://photos.zillowstatic.com/fp/9344a9882ed47c0ac4be5f4029c41c0d-p_f.jpg)
![](https://photos.zillowstatic.com/fp/2dc641c6c4bca5ac374c17064492bb31-p_f.jpg)
![](https://photos.zillowstatic.com/fp/726225255a4a6f025e586617068262aa-p_f.jpg)
![](https://photos.zillowstatic.com/fp/fba3c843eac17edd43c4f9339ffbe585-p_f.jpg)

**`labels.json` zillowId for this listing:** `29363148`

---

## 10. 4713 Little Hill Cir, Austin, TX

- **Zillow:** https://www.zillow.com/homedetails/29392986_zpid/
- **Photo count:** 25
- **Hard-case heuristic score:** 3 (higher = more ambiguous)

**Prior analysis (hint, do not trust blindly):** floors: unknown, countertops: unknown, appliances: unknown, ceilings: unknown, light: unknown, age: unknown

### First 6 photos (preview — see Zillow for the rest)

![](https://photos.zillowstatic.com/fp/b5d4cb71d719abe461763421f8df5a87-p_f.jpg)
![](https://photos.zillowstatic.com/fp/2996ac8e91a15d6f6b08add16f203580-p_f.jpg)
![](https://photos.zillowstatic.com/fp/5f72e2a48452f77367c7e4190a1e4361-p_f.jpg)
![](https://photos.zillowstatic.com/fp/087d3ffe19d08a02172cc1a61d05aa40-p_f.jpg)
![](https://photos.zillowstatic.com/fp/08f1f8be9d5fe302e007831a45022e6a-p_f.jpg)
![](https://photos.zillowstatic.com/fp/2234125913ca64965bc2c20a69bf4bf3-p_f.jpg)

**`labels.json` zillowId for this listing:** `29392986`

---

## 11. 1731 Giles St, Austin, TX

- **Zillow:** https://www.zillow.com/homedetails/29394792_zpid/
- **Photo count:** 26
- **Hard-case heuristic score:** 3 (higher = more ambiguous)

**Prior analysis (hint, do not trust blindly):** floors: unknown, countertops: unknown, appliances: unknown, ceilings: unknown, age: dated

> _This is primarily a land/teardown listing for a 1954-built structure; the listing description explicitly markets it as a redevelopment opportunity with the existing house offering little value. All MLS interior fields are listed as 'See Remarks' and no interior photos were provided, strongly suggesting the seller is not marketing the structure itself but rather the lot, location, and development potential._

### First 6 photos (preview — see Zillow for the rest)

![](https://photos.zillowstatic.com/fp/f2f4381c8e3dbe2aa70b3badcc2be9c9-p_f.jpg)
![](https://photos.zillowstatic.com/fp/9333b75c0d95c4571ca1552408850020-p_f.jpg)
![](https://photos.zillowstatic.com/fp/db59bba6fad3f6d16bbbc9065839a19a-p_f.jpg)
![](https://photos.zillowstatic.com/fp/ba67469080e45515feb4bfe7710022cc-p_f.jpg)
![](https://photos.zillowstatic.com/fp/3c9b606c7d72aec0cc439f238c7a191f-p_f.jpg)
![](https://photos.zillowstatic.com/fp/fb491c0c996b38ba3260a43aeed09f15-p_f.jpg)

**`labels.json` zillowId for this listing:** `29394792`

---

## 12. 4601 Elm Ridge Ln, Garland, TX

- **Zillow:** https://www.zillow.com/homedetails/27002377_zpid/
- **Photo count:** 21
- **Hard-case heuristic score:** 3 (higher = more ambiguous)

**Prior analysis (hint, do not trust blindly):** floors: unknown, countertops: unknown, appliances: unknown, ceilings: unknown, light: unknown, age: unknown

### First 6 photos (preview — see Zillow for the rest)

![](https://photos.zillowstatic.com/fp/b7166a2ca4bf675836baaca82cba3a5c-p_f.jpg)
![](https://photos.zillowstatic.com/fp/14281b9cdc13e70773801651f2cd7c8a-p_f.jpg)
![](https://photos.zillowstatic.com/fp/d430c58b1c85259de1d4b5d63c31ec11-p_f.jpg)
![](https://photos.zillowstatic.com/fp/5014e9885478abf3f1bb68cb6492e51f-p_f.jpg)
![](https://photos.zillowstatic.com/fp/25cb723526264713706aafee37a268ef-p_f.jpg)
![](https://photos.zillowstatic.com/fp/2aa14411a766a450c7c04b36ab4d1c48-p_f.jpg)

**`labels.json` zillowId for this listing:** `27002377`
