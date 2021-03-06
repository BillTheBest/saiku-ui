/*
 * Query.js
 * 
 * Copyright (c) 2011, OSBI Ltd. All rights reserved.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
 * MA 02110-1301  USA
 */
/**
 * Workspace query
 */
var Query = Backbone.Model.extend({
    initialize: function(args, options) {
        // Save cube
        _.extend(this, options);
        
        // Bind `this`
        _.bindAll(this, "run", "move_dimension", "reflect_properties");
        
        // Generate a unique query id
        this.uuid = 'xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, 
            function (c) {
                var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            }).toUpperCase();
        
        // Initialize properties, action handler, and result handler
        this.action = new QueryAction({}, { query: this });
        this.result = new Result({}, { query: this });
        this.scenario = new QueryScenario({}, { query: this });
    },
    
    parse: function(response) {
        // Assign id so Backbone knows to PUT instead of POST
        this.id = this.uuid;

        // Grab attributes
        if (this.attributes.xml !== undefined && 
            this.attributes.cube === undefined) {            
            this.set({
                connection: response.cube.connectionName,
                catalog: response.cube.catalogName,
                schema: response.cube.schemaName,
                cube: response.cube.name,
                axes: response.saikuAxes
            });
        }

        // Fetch initial properties from server
        if (! this.properties) {
            this.properties = new Properties({}, { query: this });
        } else {
            this.properties.fetch({
                success: this.reflect_properties
            });
        }
    },
    
    reflect_properties: function() {
        this.workspace.trigger('properties:loaded');
    },
    
    run: function(force) {
        // Check for automatic execution
        if (! this.properties.properties['saiku.olap.query.automatic_execution'] &&
            ! force) {
            return;
        }
        
        // TODO - Validate query
        
        // Run it
        $(this.workspace.el).find('.workspace_results table')
            .html('<tr><td>Running query...</td></tr>');
        this.result.fetch();
    },
    
    move_dimension: function(dimension, $target_el, index) {
        $(this.workspace.el).find('.run').removeClass('disabled_toolbar');
        
        var target = '';
        if ($target_el.hasClass('rows')) target = "ROWS";
        if ($target_el.hasClass('columns')) target = "COLUMNS";
        if ($target_el.hasClass('filter')) target = "FILTER";
        
        var url = "/axis/" + target + "/dimension/" + dimension;
        var index = $target_el.find('li.ui-draggable').index(
                $target_el.find('a[href="#' + dimension + '"]').parent() );
        
        this.action.post(url, {
            data: {
                position: index
            },
            
            success: function() {
                if (this.query.properties
                    .properties['saiku.olap.query.automatic_execution'] === 'true') {
                    this.query.run();
                }
            }
        });
    },
    
    url: function() {
        return encodeURI(Saiku.session.username + "/query/" + this.uuid);
    }
});
