HOW TO ADD YOUR OWN SUIT MODELS
1. Each suit must be a RIGGED .glb with a Mixamo skeleton.
   (Unrigged? Upload to mixamo.com, place the markers, download FBX "With Skin" in T-pose,
    then in Blender: File > Import FBX, File > Export glTF 2.0 (.glb).)
2. Put the .glb files in this "suits" folder.
3. List them in suits.json, for example:
   {
     "hideBuiltIn": true,
     "suits": [
       { "name": "Fresh Day",  "file": "fresh_day.glb" },
       { "name": "Black Suit", "file": "black_suit.glb" }
     ]
   }
   hideBuiltIn: true hides the built-in painted suits so only your models appear.
4. Reload the game. Your suits appear in the suit menu with their own textures, and the
   swing, run and fight animations are connected automatically.
