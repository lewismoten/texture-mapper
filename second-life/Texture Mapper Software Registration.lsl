init()
{
    string name = llKey2Name(llGetOwner());
    string secret = "shakE wel.l bef?ore ope''ni#Ng 163mL";
    string hash = llSHA1String(name + secret);
    string code = llGetSubString(hash, 4, 19);
    code = llToUpper(code);
    
    llOwnerSay("\nName: " + name + "\nSerial Number: " + code + "\nTexture Mapper: http://www.box.net/shared/035ftzyomx");

}
default
{
    state_entry()
    {
        init();
    }
    on_rez(integer start_param)
    {
        init();
    }
    touch_start(integer total_number)
    {
        if(llDetectedKey(0) == llGetOwner())
            init();
    }
}
