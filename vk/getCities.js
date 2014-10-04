/**
 * Created by Shani(satyashani@gmail.com) on 4/10/14.
 */
var list = $("div#tickets_dmca_country_wrap ul li");
var cities = [];
var getCities = function(i){
    var citilist = $("div#tickets_dmca_city_wrap div.result_list_scrollable ul li");
    list.eq(i).click();
    var waittime = 0;
    var wait = function(){
        setTimeout(function(){
            waittime+=500;
            var citilistnew = $("div#tickets_dmca_city_wrap div.result_list_scrollable ul li");
            if(citilist.size()<2 || (citilistnew.size() > 1 && citilist.eq(1).text()!=citilistnew.eq(1).text())){
                citilistnew.each(function(){
                    cities.push({value: $(this).attr('val'),name: $(this).text()});
                });
            }else{
                if(waittime>3500 && list.size()>(i+1)) getCities(i+1);
                else if(list.size()===(i+1)) console.log(cities);
                else wait();
            }
        },500);
    };
};
getCities(1);