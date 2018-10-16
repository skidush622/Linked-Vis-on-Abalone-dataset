var abalone_data;

// all dimensions: 'length', 'height', 'shucked weight', 'diameter', 'whole weight', 'viscera weight', 'rings'
var selected_atts = ['length', 'height', 'shucked weight', 'diameter', 'whole weight', 'viscera weight', 'rings'];
var num_points = 800
var width = 1400, height = 800;
var pad = 20;
var actual_width = width-2*pad, actual_height = height-2*pad;
var x, y, domainByAttr, size, shuffled_dat, xAxis, yAxis

function plot_it()  {
	// some data messing around-ness
	selected_atts = d3.shuffle(selected_atts);
    
	abalone_data = abalone_data.map(datum => {
		var filtered_datum = {};
		selected_atts.forEach(d => { filtered_datum[d] = +datum[d]; })
		return filtered_datum;
	});
    
	shuffled_data = d3.shuffle(abalone_data);
    
	abalone_data = [];
	for(var i = 0; i < num_points; i++)
		abalone_data.push({key:i,value:shuffled_data[i]});
    
    d3.select('body').append('svg').attr('width', width).attr('height', height)
    d3.select('svg').append('g').attr('transform', 'translate('+pad+','+pad+')').attr('width', actual_width/2).attr('id', 'left')
    var divider = pad+actual_width/2
    
    //plot parallel coordinates
    var gap = 0.5*actual_width/(selected_atts.length-1)-15
        
    var y_scales = {}
    var min_y = height-pad, max_y = pad, min_x = pad, max_x = width-pad
    for(var i=0; i<selected_atts.length; i++)
        y_scales[selected_atts[i]] = d3.scaleLinear()
                                       .domain(d3.extent(shuffled_data, function(p) { return +p[selected_atts[i]] }))
                                       .range([min_y,max_y])
    
    var x_position = {}
    for(var i=0; i<selected_atts.length; i++)
    {
        x_position[selected_atts[i]] = divider+i*gap
        d3.select('svg').append('g').attr('transform', 'translate('+x_position[selected_atts[i]]+',0)').call(d3.axisLeft(y_scales[selected_atts[i]]))
    }
    
    var data = []
    for(var i = 0; i < num_points; i++)
    {
        var temp = []
        for(var j=0; j<selected_atts.length; j++)
            temp.push({'dimension': selected_atts[j], 'val': shuffled_data[i][selected_atts[j]]})
        data.push(temp)
    }
    
    line_scale = d3.line()
       .x(d => x_position[d.dimension])
       .y(d => y_scales[d.dimension](d.val))
    
    d3.select('svg').selectAll('aaa').data(data).enter().append('path')
                    .attr('d', d => line_scale(d))
                    .attr('stroke', 'silver')
                    .attr('fill', 'none')
                    .attr('opacity', 0.2)
                    .attr('id', (d,i) => "p"+i)
    
    d3.select('svg').selectAll('aaa').data(selected_atts).enter().append('text')
                    .attr('x', d => x_position[d]).attr('y', max_y-10)
                    .text(d => d)
    
    //plot scatterplot matrix
    size = 0.5*actual_width/(selected_atts.length)
    x = d3.scaleLinear().range([pad/2, size-pad/2])
    y = d3.scaleLinear().range([size-pad/2, pad/2])
    xAxis = d3.axisBottom().scale(x)
    yAxis = d3.axisLeft().scale(y)
    
    domainByAttr = {}
    selected_atts.forEach(function(attr) {
                   domainByAttr[attr] = d3.extent(shuffled_data, function(d) { return d[attr]; });
                   })
    
    var group_scale_x = d3.scaleBand().domain(selected_atts).range([min_x, divider])
    var group_scale_y = d3.scaleBand().domain(selected_atts).range([max_y, min_y])
    for(var j=0; j<selected_atts.length; j++)
    {
        d3.select('#left').selectAll('aaa').data(selected_atts).enter().append('g')
                  .attr('transform', d => ('translate('+group_scale_x(d)+','+group_scale_y(selected_atts[j])+')'))
                  .attr('width', size).attr('height', size)
                  .attr('class', function(d,i){ if(i>j)
                                                  return 'remove'
                                                else if(i==j)
                                                  return 'diagonal'
                                                else
                                                  return 'plot'
                        })
                  .attr('data_x', d => d)
                  .attr('data_y', selected_atts[j])
       
    }
    d3.selectAll('.remove').remove()
    // Titles for the diagonal.
    d3.selectAll('.diagonal').append("text")
                 .attr("x", 10)
                 .attr("y", size/2)
                 .text(d => d)
    
    var cells = d3.select('#left').selectAll('.plot').each(plot)
    cells.on("mousedown", mousedown)
         .on("mouseup", mouseup)
}

function plot(p) {
    var cell = d3.select(this)
    cell.append("rect")
        .attr("class", "frame")
        .attr("x", pad/2)
        .attr("y", pad/2)
        .attr("width", size-pad)
        .attr("height", size-pad)
        .attr("fill", "silver")
    
    x.domain(domainByAttr[cell.attr("data_x")])
    y.domain(domainByAttr[cell.attr("data_y")])
    cell.append('g').attr('transform', 'translate('+pad/2+',0)').call(d3.axisLeft(y).ticks(5))
    var temp = size-pad/2
    cell.append('g').attr('transform', 'translate(0,'+temp+')').call(d3.axisBottom(x).ticks(5))
    
    cell.selectAll("circle")
        .data(shuffled_data)
        .enter().append("circle")
        .attr("cx", d => x(d[cell.attr("data_x")]))
        .attr("cy", d => y(d[cell.attr("data_y")]))
        .attr("r", 1)
        .style("fill", 'black')
        .attr("id", (d,i) => "c"+i)
}
var brushCell
var rect
function mousedown() {
    var m = d3.mouse(this)
    // Clear the previously-active brush, if any.
    if (brushCell !== this) {
        d3.select(brushCell).call(clear)
        brushCell = this
        x.domain(domainByAttr[d3.select(brushCell).attr("data_x")])
        y.domain(domainByAttr[d3.select(brushCell).attr("data_y")]);
    }
    rect = d3.select(this).append("rect")
              .attr("x", m[0])
              .attr("y", m[1])
              .attr("height", 0)
              .attr("width", 0)
              .attr("opacity", 0.2)
              .attr("id", "brushrect")
    
    d3.select(this).on("mousemove", mousemove)
}

function mousemove() {
    var m = d3.mouse(this);
    
    rect.attr("width", Math.max(0, m[0] - +rect.attr("x")))
        .attr("height", Math.max(0, m[1] - +rect.attr("y")))
    
    // Highlight the selected circles.
    var e = [[rect.attr("x"), rect.attr("y")],[m[0],m[1]]]
    var px = d3.select(this).attr("data_x")
    var py = d3.select(this).attr("data_y")
    d3.select('#left').selectAll("circle").classed("selected", function(d) {
                                                   return !e
                                                   ? false
                                                   : !(
                                                      e[0][0] > x(+d[px]) || x(+d[px]) > e[1][0]
                                                      || e[0][1] > y(+d[py]) || y(+d[py]) > e[1][1]
                                                      )
                                                   })
    var selected_cricles = d3.select(this).selectAll(".selected").each(function(d,i){
                    var key = d3.select(this).attr("id").slice(1)
                    d3.select("#p"+key).attr('opacity', 1).attr('stroke', '#808000')
                                                                       })
}
function mouseup() {
    d3.select(this).on("mousemove", null)
}

function clear() {
    d3.select('#brushrect').remove()
    d3.select('#left').selectAll(".selected").classed("hidden", false)
    d3.selectAll('path').attr('opacity', 0.2).attr('stroke', 'silver')
}
