try:
    month_of_birth = input("Enter month of birth.?\n ")
    r = month_of_birth.capitalize()

    if r == "January":
        print(f"Your birth stone is Garnet")
    if r == "February":
        print(f"Your birth stone is Amethyst")
    if r == "March":
        print(f"Your birth stone is Aquamarine")
    if r == "April":
        print(f"Your birth stone is Diamond")
    if r == "May":
        print(f"Your birth stone is Emerald")
    if r == "June":
        print(f"Your birth stone is Alexandrite")
    if r == "July":
        print(f"Your birth stone is Rudy")
    if r == "August":
        print(f"Your birth stone is Peridot")
    if r == "September":
        print(f"Your birth stone is Sapphire")
    if r == "October":
        print(f"Your birth stone is Tourmaline")
    if r == "November":
        print(f"Your birth stone is Topaz")
    if r == "December":
        print(f"Your birth stone is Blue Topaz")
except:
    print("Invalid text try again.")
