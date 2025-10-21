from PIL import Image, ImageEnhance, ImageFilter

image = Image.open(
    '/Users/Henry/Master Folder /APPS/APPS/Photo Editor/Guess.png')

image_blur = image.filter(ImageFilter.BLUR)
image_contour = image.filter(ImageFilter.CONTOUR)
image_detail = image.filter(ImageFilter.DETAIL)
image_edge = image.filter(ImageFilter.EDGE_ENHANCE)
image_edge_more = image.filter(ImageFilter.EDGE_ENHANCE_MORE)
image_find_edges = image.filter(ImageFilter.FIND_EDGES)
image_emboss = image.filter(ImageFilter.EMBOSS)
image_sharp = image.filter(ImageFilter.SHARPEN)
image_smooth = image.filter(ImageFilter.SMOOTH)
image_smooth_more = image.filter(ImageFilter.SMOOTH_MORE)

image_blur.show()
image_sharp.show()
image_smooth.show()
image_detail.show()
image_emboss.show()

# image_rotate = image.rotate(60, expand=True, fillcolor = ImageColor.getcolor('red','RGB))
# image_crop = image.crop((550, 400, 1500, 1150))
# image_flip_horizontal = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
# image_flip_vertical = image.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
image_resize = image.resize((30, 30))
# image_resize.show()

color_enchancer = ImageEnhance.Color(image)
contrast_enchancer = ImageEnhance.Contrast(image)
brightness_enchancer = ImageEnhance.Brightness(image)
sharpness_enchancer = ImageEnhance.Sharpness(image)

enhanced_brightness = brightness_enchancer.enhance(1)
# enhanced_brightness.show()
enhanced_image = sharpness_enchancer.enhance(2)
enhanced_image.show(2)

enhanced_image.save("/Users/Henry/Master Folder")
